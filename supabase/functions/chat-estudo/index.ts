// Edge Function: chat com IA por matéria (brief 6.2, arquitetura seção 4
// — "chamada só pela Edge Function, nunca direto do app"). Trocado de
// Groq pra Cloudflare Workers AI a pedido do usuário (o login do console
// da Groq estava com bug do lado deles, sem dar pra criar a chave — ver
// `regrasEstudo.ts`). O app nunca vê `CF_API_TOKEN`; ela só existe como
// secret desta função (`supabase secrets set CF_API_TOKEN=...` e
// `CF_ACCOUNT_ID=...`).
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  MODELO_VISAO,
  ROTULO_MODO,
  escolherModelo,
  exigeAssinatura,
  montarPromptSistema,
  montarPromptVisao,
  type ModoChatEstudo,
} from '../_shared/regrasEstudo.ts';

// Bucket privado das fotos de anotação (ver migration
// `estudo_fotos_anotacao`) — path sempre "{aluno_id}/arquivo.ext".
const BUCKET_FOTOS_ESTUDO = 'estudo-fotos';
// O Ollama Cloud (provedor do modelo de visão atual, ver `MODELO_VISAO`
// em `regrasEstudo.ts`) quer a imagem em base64 puro (sem prefixo
// `data:...;base64,`) dentro de `messages[].images` — infla o tamanho
// uns 33% em JSON, bem menos que os ~300% do array de bytes que o
// modelo anterior (LLaVA, na Cloudflare) exigia. 4 MB de foto original
// vira uns 5,5 MB de corpo de requisição, folga generosa pra uma foto
// de caderno comprimida no cliente (`escolherFotoAnotacao`,
// tipicamente bem menor que isso). Acima disso, devolve um erro
// amigável em vez de mandar um payload gigante e receber um erro
// obscuro de volta.
const FOTO_TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID');
const CF_API_TOKEN = Deno.env.get('CF_API_TOKEN');
// Provedor separado do texto (Cloudflare acima) — só pro modelo de
// visão, pedido do próprio usuário ("e um modelo ollama como posso
// usar"). Chave gerada na conta Ollama Cloud dele, guardada só como
// secret desta função (`supabase secrets set OLLAMA_API_KEY=...`),
// nunca no código nem no app.
const OLLAMA_API_KEY = Deno.env.get('OLLAMA_API_KEY');

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
    const fotoCaminho = (payload?.fotoCaminho as string | undefined)?.trim() || null;

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

    // Precisa da service role já aqui pra buscar os bytes da foto (o
    // bucket é privado e o `userClient` até teria acesso via RLS, mas
    // baixar arquivo binário grande é mais direto com um client dedicado).
    // Validar que o caminho é mesmo da PRÓPRIA pasta do usuário antes de
    // baixar é essencial — a service role ignora RLS por definição, então
    // sem essa checagem um payload forjado com o caminho de outro aluno
    // faria esta função ler a foto de qualquer um.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let fotoBase64: string | null = null;
    if (fotoCaminho) {
      if (!fotoCaminho.startsWith(`${user.id}/`)) {
        return respostaJson({ error: 'Foto inválida.' }, 400, origin);
      }
      if (!OLLAMA_API_KEY) {
        // Não é um erro de código — a chave da Ollama Cloud ainda não
        // foi configurada (ver comentário em `OLLAMA_API_KEY` acima).
        return respostaJson(
          { error: 'IA de visão ainda não foi configurada (falta OLLAMA_API_KEY).' },
          503,
          origin,
        );
      }
      const { data: fotoBlob, error: fotoError } = await admin.storage
        .from(BUCKET_FOTOS_ESTUDO)
        .download(fotoCaminho);
      if (fotoError || !fotoBlob) {
        return respostaJson({ error: 'Não achei essa foto — tenta enviar de novo.' }, 400, origin);
      }
      if (fotoBlob.size > FOTO_TAMANHO_MAXIMO_BYTES) {
        return respostaJson(
          { error: 'Essa foto é grande demais pra IA processar — tenta uma foto mais simples.' },
          400,
          origin,
        );
      }
      fotoBase64 = encodeBase64(await fotoBlob.arrayBuffer());
    }

    // Assinante do Turma+ Premium (R$1,99/mês, ver migration
    // `assinatura_stripe`) não tem nenhum dos dois limites abaixo — é
    // literalmente o que a assinatura vende ("IA sem limites"). Só o
    // booleano importa aqui: quem escreve nele é exclusivamente o
    // webhook do Stripe (service role), nunca o app, então não tem
    // como um aluno comum burlar isso mudando o próprio perfil.
    const { data: perfilAssinatura } = await userClient
      .from('profiles')
      .select('assinatura_ativa')
      .eq('id', user.id)
      .single();
    const ehAssinante = perfilAssinatura?.assinatura_ativa === true;

    // Modos Premium (pedido do usuário) -- checado ANTES do rate limit:
    // é uma negação diferente, quem não tem acesso ao modo nem chega a
    // gastar cota de mensagem. Conferido aqui (não só escondendo o botão
    // no app) porque `supabase.functions.invoke` pode ser chamado direto,
    // sem passar pela UI.
    if (exigeAssinatura(modo) && !ehAssinante) {
      return respostaJson(
        {
          error: `"${ROTULO_MODO[modo]}" é um recurso do Turma+ Premium (R$1,99/mês) -- assine pra desbloquear.`,
        },
        402,
        origin,
      );
    }

    if (!ehAssinante) {
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
            error: `Você já mandou ${LIMITE_MENSAGENS_DIARIO} mensagens pra IA nas últimas 24 horas — assine o Turma+ Premium (R$1,99/mês) pra IA sem limites, ou volta amanhã.`,
          },
          429,
          origin,
        );
      }
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
    // mesmo formato que a Groq usava, então essa parte não mudou. Só
    // usada no caminho sem foto (o modelo de visão não aceita esse
    // formato, ver `MODELO_VISAO`).
    const historicoConvertido = (historico ?? []).reverse().map((m) => ({
      role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
      content: m.conteudo as string,
    }));

    const modelo = fotoBase64 ? MODELO_VISAO : escolherModelo(modo);
    let textoResposta = '';

    if (fotoBase64) {
      // API própria da Ollama Cloud (`ollama.com/api/chat`), não a
      // Cloudflare usada pro texto abaixo — provedor diferente pro
      // modelo de visão (ver `OLLAMA_API_KEY` e `MODELO_VISAO`). Sem
      // histórico de conversa aqui, mesma razão de antes — cada foto é
      // uma pergunta isolada, ninguém manda foto atrás de foto na
      // mesma dúvida.
      const promptVisao = montarPromptVisao({ nomeMateria: materia.nome, pergunta: mensagem });

      async function chamarOllamaVisao() {
        return fetch('https://ollama.com/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OLLAMA_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODELO_VISAO,
            messages: [{ role: 'user', content: promptVisao, images: [fotoBase64] }],
            stream: false,
          }),
        });
      }

      let respostaOllama = await chamarOllamaVisao();
      if (respostaOllama.status === 429 || respostaOllama.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        respostaOllama = await chamarOllamaVisao();
      }

      if (!respostaOllama.ok) {
        const corpo = await respostaOllama.text();
        console.error('chat-estudo: Ollama Cloud (visão) recusou', respostaOllama.status, corpo);
        const mensagemErro =
          respostaOllama.status === 429 || respostaOllama.status === 503
            ? 'A IA está sobrecarregada agora — tenta de novo em alguns segundos.'
            : 'Não deu pra falar com a IA agora.';
        return respostaJson({ error: mensagemErro }, 502, origin);
      }

      const dadosResposta = await respostaOllama.json();
      textoResposta = dadosResposta?.message?.content ?? '';
    } else {
      const systemPrompt = montarPromptSistema({ nomeMateria: materia.nome, modo });

      // 429 (cota do tier grátis estourada) ou 503 (sobrecarga
      // temporária) — uma única nova tentativa depois de um respiro
      // curto resolve a maioria dos casos sem esperar o usuário clicar
      // "Enviar" de novo.
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
        console.error(
          'chat-estudo: Cloudflare Workers AI recusou',
          respostaCloudflare.status,
          corpo,
        );
        const mensagemErro =
          respostaCloudflare.status === 429 || respostaCloudflare.status === 503
            ? 'A IA está sobrecarregada agora — tenta de novo em alguns segundos.'
            : 'Não deu pra falar com a IA agora.';
        return respostaJson({ error: mensagemErro }, 502, origin);
      }

      const dadosResposta = await respostaCloudflare.json();
      textoResposta = dadosResposta.choices?.[0]?.message?.content ?? '';
    }

    if (!textoResposta) {
      console.error('chat-estudo: IA sem texto na resposta');
      return respostaJson({ error: 'A IA não conseguiu responder dessa vez.' }, 502, origin);
    }

    // Persiste os dois lados com a service role — não existe policy de
    // INSERT pra `authenticated` nessa tabela de propósito (evita um
    // cliente forjar uma mensagem "assistente"). `midia_url` só na
    // mensagem do usuário (a foto que ele mandou) — a resposta da IA
    // nunca tem mídia própria.
    const { error: insertError } = await admin.from('chat_ia_mensagens').insert([
      {
        aluno_id: user.id,
        materia_id: materiaId,
        papel: 'usuario',
        conteudo: mensagem,
        midia_url: fotoCaminho,
      },
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
