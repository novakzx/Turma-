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
  extrairTitulosSlides,
  inserirImagensNosSlides,
  montarPromptImagemSlide,
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

const BUCKET_APRESENTACAO_MIDIA = 'apresentacoes-midia';

/** Gera 1 imagem via Cloudflare Workers AI (`flux-1-schnell`, modelo
 * rápido — é o que faz gerar 6-8 imagens em paralelo terminar em
 * segundos, não minutos). Endpoint nativo `/ai/run/{modelo}` (diferente
 * do `/ai/v1/chat/completions` usado pro texto, que é o compatível com
 * OpenAI) — devolve a imagem como bytes crus (`Content-Type: image/*`)
 * OU embrulhada em JSON (`{result:{image: base64}}`, o wrapper padrão
 * de toda API v4 da Cloudflare) dependendo do caminho interno que a
 * requisição pega; tratado os dois formatos aqui em vez de assumir só
 * um, já que a documentação pública não deixa isso 100% claro e o
 * comportamento real só se confirma testando ao vivo. `null` em
 * qualquer falha (nunca lança) — geração de imagem é um extra, não pode
 * derrubar a apresentação inteira por causa de um slide só. */
async function chamarCloudflareImagem(
  prompt: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const resposta = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({ prompt }),
      },
    );
    if (!resposta.ok) {
      console.error(
        'chat-estudo: geração de imagem de slide recusada',
        resposta.status,
        await resposta.text(),
      );
      return null;
    }

    const contentType = resposta.headers.get('content-type') ?? '';
    if (contentType.startsWith('image/')) {
      return { bytes: new Uint8Array(await resposta.arrayBuffer()), contentType };
    }

    const dados = await resposta.json();
    const base64 = dados?.result?.image as string | undefined;
    if (!base64) {
      console.error('chat-estudo: resposta de imagem sem campo esperado', JSON.stringify(dados));
      return null;
    }
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return { bytes, contentType: 'image/jpeg' };
  } catch (err) {
    console.error('chat-estudo: erro gerando imagem de slide', err);
    return null;
  }
}

/** Gera uma imagem por slide (em paralelo), sobe cada uma pro bucket
 * `apresentacoes-midia` (path começando pelo id do aluno — RLS de
 * SELECT restringe por isso, ver migration `apresentacoes_midia`) e
 * devolve o texto original com `![slide-imagem](caminho)` inserido
 * depois do conteúdo de cada slide que deu certo (`inserirImagensNosSlides`).
 * Slide sem imagem (geração ou upload falhou) só não ganha essa linha —
 * `analisarApresentacao` no app já trata isso como "sem imagem", não
 * como erro. Se o texto não tiver nenhum slide no formato esperado
 * (`extrairTitulosSlides` devolve `null`), devolve o texto sem mexer. */
async function gerarImagensDosSlides(params: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  nomeMateria: string;
  textoResposta: string;
}): Promise<string> {
  const titulos = extrairTitulosSlides(params.textoResposta);
  if (!titulos) return params.textoResposta;

  const resultados = await Promise.all(
    titulos.map((titulo) =>
      chamarCloudflareImagem(montarPromptImagemSlide(params.nomeMateria, titulo)),
    ),
  );

  const caminhos = await Promise.all(
    resultados.map(async (resultado, indice) => {
      if (!resultado) return null;
      const extensao = resultado.contentType.includes('png') ? 'png' : 'jpg';
      const caminho = `${params.userId}/${Date.now()}-${indice}.${extensao}`;
      const { error } = await params.admin.storage
        .from(BUCKET_APRESENTACAO_MIDIA)
        .upload(caminho, resultado.bytes, { contentType: resultado.contentType });
      if (error) {
        console.error('chat-estudo: falha ao subir imagem de slide', error);
        return null;
      }
      return caminho;
    }),
  );

  return inserirImagensNosSlides(params.textoResposta, caminhos);
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Modo "apresentacao" (pedido do usuário: "não tem como ele fazer as
    // fotos da apresentação e não só o texto?") — gera uma imagem por
    // slide em paralelo (Promise.all, não sequencial: sequencial pra
    // 6-8 slides levaria dezenas de segundos; em paralelo, o tempo real
    // é próximo do de uma imagem só). Falha de um slide não derruba os
    // outros nem a resposta inteira — cada geração/upload é isolada em
    // try/catch (dentro de `chamarCloudflareImagem`) e devolve `null`
    // nesse caso; `inserirImagensNosSlides` simplesmente não escreve
    // linha de imagem pro(s) slide(s) que falharam.
    const textoFinal =
      modo === 'apresentacao'
        ? await gerarImagensDosSlides({
            admin,
            userId: user.id,
            nomeMateria: materia.nome,
            textoResposta,
          })
        : textoResposta;

    // Persiste os dois lados com a service role — não existe policy de
    // INSERT pra `authenticated` nessa tabela de propósito (evita um
    // cliente forjar uma mensagem "assistente").
    const { error: insertError } = await admin.from('chat_ia_mensagens').insert([
      { aluno_id: user.id, materia_id: materiaId, papel: 'usuario', conteudo: mensagem },
      { aluno_id: user.id, materia_id: materiaId, papel: 'assistente', conteudo: textoFinal },
    ]);
    if (insertError) console.error('chat-estudo: falha ao salvar histórico', insertError);

    return respostaJson({ resposta: textoFinal, modelo }, 200, origin);
  } catch (err) {
    // Detalhe de verdade só no log -- nunca na resposta (evita vazar
    // stack trace/mensagem interna pra quem chamou).
    console.error('chat-estudo falhou:', err);
    return respostaJson({ error: 'internal_error' }, 500, origin);
  }
});
