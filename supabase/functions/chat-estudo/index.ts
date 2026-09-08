// Edge Function: chat com IA por matéria (brief 6.2, arquitetura seção 4
// — "chamada só pela Edge Function, nunca direto do app"). Trocado de
// Groq pra Cloudflare Workers AI a pedido do usuário (o login do console
// da Groq estava com bug do lado deles, sem dar pra criar a chave — ver
// `regrasEstudo.ts`). O app nunca vê `CF_API_TOKEN`; ela só existe como
// secret desta função (`supabase secrets set CF_API_TOKEN=...` e
// `CF_ACCOUNT_ID=...`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  escolherModelo,
  montarPromptSistema,
  type ModoChatEstudo,
} from '../_shared/regrasEstudo.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID');
const CF_API_TOKEN = Deno.env.get('CF_API_TOKEN');

const HISTORICO_MAXIMO = 20;
const MENSAGEM_TAMANHO_MAXIMO = 4000;
// Mesmo o tier grátis do Cloudflare Workers AI sendo generoso (10.000
// "neurons"/dia), é um teto compartilhado por todo o projeto — sem
// limite nenhum aqui, um script batendo nesse endpoint em loop estoura a
// cota pra todo mundo. Generoso o bastante pra uso normal (ninguém manda
// 15 perguntas em 5 minutos de verdade estudando), curto o bastante pra
// travar abuso automatizado (rajada — script/loop). Separado do limite
// diário abaixo, que é sobre volume total, não velocidade.
const LIMITE_MENSAGENS_RAJADA = 15;
const JANELA_LIMITE_RAJADA_MS = 5 * 60 * 1000;

// Limite diário por aluno (pedido do usuário) — a rajada acima trava
// script/loop, mas não impede uma conta só de usar a cota do dia inteiro
// sozinha ao longo de várias horas de uso normal. 30/dia é generoso pra
// estudar de verdade (várias matérias, plano de prova) sem deixar uma
// conta consumir a cota compartilhada de 10.000 neurons/dia sozinha —
// ajuste aqui se a escola crescer e a cota apertar.
const LIMITE_MENSAGENS_DIARIO = 30;
const JANELA_LIMITE_DIARIO_MS = 24 * 60 * 60 * 1000;

// Só as origens de verdade deste projeto — `*` deixaria qualquer site
// chamar essa função (com o JWT de quem visitasse ele, se conseguisse
// um de algum jeito) livremente. `undefined` (nenhum header de CORS)
// quando a origem não bate é o comportamento certo: o navegador de
// quem chamou vai bloquear a resposta sozinho.
//
// ACHADO (usuário relatou "Failed to send a request to the Edge
// Function" ao usar o chat): `turma-rho.vercel.app` tinha virado um
// domínio morto (`curl` confirma `DEPLOYMENT_NOT_FOUND`) — o domínio de
// produção real é `suaturma.vercel.app`, que nunca tinha entrado nessa
// lista. Toda chamada do navegador de produção batia exatamente nesse
// "CORS não bate, sem header nenhum" documentado acima — silencioso do
// jeito mais difícil de diagnosticar sem abrir o console.
const ORIGENS_PERMITIDAS = ['https://suaturma.vercel.app', 'http://localhost:8081'];

function corsHeaders(origin: string | null) {
  const permitida = origin && ORIGENS_PERMITIDAS.includes(origin);
  return {
    ...(permitida ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function respostaJson(corpo: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      // Não é um erro de código — são as credenciais ainda não terem
      // sido configuradas (ver README > "Edge Functions e automações").
      return respostaJson(
        { error: 'Chat com IA ainda não foi configurado (falta CF_ACCOUNT_ID/CF_API_TOKEN).' },
        503,
        origin,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respostaJson({ error: 'Sem autenticação.' }, 401, origin);
    }

    const payload = await req.json();
    const materiaId = payload?.materiaId as string | undefined;
    const mensagem = (payload?.mensagem as string | undefined)?.trim();
    const modo = (payload?.modo as ModoChatEstudo | undefined) ?? 'duvida';

    if (!materiaId || !mensagem) {
      return respostaJson({ error: 'payload inválido' }, 400, origin);
    }
    if (mensagem.length > MENSAGEM_TAMANHO_MAXIMO) {
      return respostaJson({ error: 'Mensagem muito longa.' }, 400, origin);
    }

    // Client "como o usuário" (repassa o JWT dele) — RLS garante sozinha
    // que só vem histórico do próprio aluno, sem precisar decodificar o
    // token à mão aqui.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return respostaJson({ error: 'Sessão inválida.' }, 401, origin);
    }

    // Rate limit por usuário (não só no cliente — um script chamando a
    // API direto, sem passar pela UI, precisa cair aqui do mesmo jeito).
    // Conta as próprias perguntas recentes em qualquer matéria — RLS de
    // `chat_ia_mensagens` já restringe ao próprio aluno.
    const { count: mensagensRajada } = await userClient
      .from('chat_ia_mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', user.id)
      .eq('papel', 'usuario')
      .gte('criado_em', new Date(Date.now() - JANELA_LIMITE_RAJADA_MS).toISOString());
    if ((mensagensRajada ?? 0) >= LIMITE_MENSAGENS_RAJADA) {
      return respostaJson(
        { error: 'Muitas mensagens em pouco tempo — espera um pouco antes de tentar de novo.' },
        429,
        origin,
      );
    }

    // Limite diário (separado da rajada acima — ver constantes no topo
    // do arquivo). Mesma query, só troca a janela de tempo e o teto.
    const { count: mensagensHoje } = await userClient
      .from('chat_ia_mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', user.id)
      .eq('papel', 'usuario')
      .gte('criado_em', new Date(Date.now() - JANELA_LIMITE_DIARIO_MS).toISOString());
    if ((mensagensHoje ?? 0) >= LIMITE_MENSAGENS_DIARIO) {
      return respostaJson(
        {
          error: `Você já mandou ${LIMITE_MENSAGENS_DIARIO} mensagens pra IA nas últimas 24 horas — volta amanhã pra continuar usando.`,
        },
        429,
        origin,
      );
    }

    const { data: materia, error: materiaError } = await userClient
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single();
    if (materiaError || !materia) {
      return respostaJson({ error: 'Matéria não encontrada.' }, 404, origin);
    }

    const { data: historico, error: historicoError } = await userClient
      .from('chat_ia_mensagens')
      .select('papel, conteudo')
      .eq('materia_id', materiaId)
      .order('criado_em', { ascending: false })
      .limit(HISTORICO_MAXIMO);
    if (historicoError) throw historicoError;

    // Cloudflare Workers AI expõe uma API compatível com OpenAI (`role:
    // 'system' | 'user' | 'assistant'`, texto direto em `content`) —
    // mesmo formato que a Groq usava, então essa parte não mudou.
    const historicoConvertido = (historico ?? []).reverse().map((m) => ({
      role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
      content: m.conteudo as string,
    }));

    const modelo = escolherModelo(modo);
    const systemPrompt = montarPromptSistema({ nomeMateria: materia.nome, modo });

    // 429 (cota do tier grátis estourada) ou 503 (sobrecarga temporária)
    // — uma única nova tentativa depois de um respiro curto resolve a
    // maioria dos casos sem esperar o usuário clicar "Enviar" de novo.
    async function chamarCloudflare() {
      return fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CF_API_TOKEN}`,
          },
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historicoConvertido,
              { role: 'user', content: mensagem },
            ],
          }),
        },
      );
    }

    let respostaCloudflare = await chamarCloudflare();
    if (respostaCloudflare.status === 429 || respostaCloudflare.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      respostaCloudflare = await chamarCloudflare();
    }

    if (!respostaCloudflare.ok) {
      const corpo = await respostaCloudflare.text();
      console.error('chat-estudo: Cloudflare Workers AI recusou', respostaCloudflare.status, corpo);
      const mensagemErro =
        respostaCloudflare.status === 429 || respostaCloudflare.status === 503
          ? 'A IA está sobrecarregada agora — tenta de novo em alguns segundos.'
          : 'Não deu pra falar com a IA agora.';
      return respostaJson({ error: mensagemErro }, 502, origin);
    }

    const dadosResposta = await respostaCloudflare.json();
    const textoResposta: string = dadosResposta.choices?.[0]?.message?.content ?? '';

    if (!textoResposta) {
      console.error(
        'chat-estudo: Cloudflare Workers AI sem texto na resposta',
        JSON.stringify(dadosResposta),
      );
      return respostaJson({ error: 'A IA não conseguiu responder dessa vez.' }, 502, origin);
    }

    // Persiste os dois lados com a service role — não existe policy de
    // INSERT pra `authenticated` nessa tabela de propósito (evita um
    // cliente forjar uma mensagem "assistente").
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: insertError } = await admin.from('chat_ia_mensagens').insert([
      { aluno_id: user.id, materia_id: materiaId, papel: 'usuario', conteudo: mensagem },
      { aluno_id: user.id, materia_id: materiaId, papel: 'assistente', conteudo: textoResposta },
    ]);
    if (insertError) console.error('chat-estudo: falha ao salvar histórico', insertError);

    return respostaJson({ resposta: textoResposta, modelo }, 200, origin);
  } catch (err) {
    // Detalhe de verdade só no log -- nunca na resposta (evita vazar
    // stack trace/mensagem interna pra quem chamou).
    console.error('chat-estudo falhou:', err);
    return respostaJson({ error: 'internal_error' }, 500, origin);
  }
});
