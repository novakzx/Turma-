// Edge Function: gera uma apresentação de slides por IA (pedido do
// usuário — "IA que faz apresentações... que nem no powerpoint
// canva"). Mesma arquitetura de `chat-estudo`: chamada só daqui, nunca
// direto do app (brief seção 4) — o app nunca vê `CF_API_TOKEN`.
// Versão "simples" (escolhida pelo usuário entre duas opções
// oferecidas): texto + imagem por IA, vistos como carrossel dentro do
// app — sem gerar arquivo .pptx baixável.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  MODELO_IMAGEM_APRESENTACAO,
  MODELO_TEXTO_APRESENTACAO,
  interpretarRespostaApresentacao,
  montarPromptApresentacao,
  montarPromptImagemSlide,
} from '../_shared/regrasApresentacao.ts';

const BUCKET_APRESENTACOES = 'apresentacoes-midia';
const TOPICO_TAMANHO_MAXIMO = 200;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID');
const CF_API_TOKEN = Deno.env.get('CF_API_TOKEN');

// Bem mais conservador que o limite de mensagens de chat (30/dia) —
// cada apresentação gera 1 chamada de texto + até 7 de imagem, um
// custo bem maior na cota compartilhada de 10.000 neurons/dia do
// Workers AI. Assinante do Turma+ Premium não tem esse teto (mesmo
// racional de `chat-estudo`).
const LIMITE_APRESENTACOES_DIARIO = 3;
const JANELA_LIMITE_DIARIO_MS = 24 * 60 * 60 * 1000;

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
      return respostaJson(
        { error: 'Gerador de apresentações ainda não foi configurado.' },
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
    const topico = (payload?.topico as string | undefined)?.trim();

    if (!materiaId || !topico) {
      return respostaJson({ error: 'payload inválido' }, 400, origin);
    }
    if (topico.length > TOPICO_TAMANHO_MAXIMO) {
      return respostaJson({ error: 'Tópico muito longo.' }, 400, origin);
    }

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: perfilAssinatura } = await userClient
      .from('profiles')
      .select('assinatura_ativa')
      .eq('id', user.id)
      .single();
    const ehAssinante = perfilAssinatura?.assinatura_ativa === true;

    if (!ehAssinante) {
      const { count: apresentacoesHoje } = await userClient
        .from('apresentacoes')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', user.id)
        .gte('criado_em', new Date(Date.now() - JANELA_LIMITE_DIARIO_MS).toISOString());
      if ((apresentacoesHoje ?? 0) >= LIMITE_APRESENTACOES_DIARIO) {
        return respostaJson(
          {
            error: `Você já gerou ${LIMITE_APRESENTACOES_DIARIO} apresentações nas últimas 24 horas — assine o Turma+ Premium (R$1,99/mês) pra gerar sem limite, ou volta amanhã.`,
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

    // Passo 1: pede o plano de slides em JSON pra IA de texto.
    const promptTexto = montarPromptApresentacao({ nomeMateria: materia.nome, topico });

    async function chamarCloudflareTexto() {
      return fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CF_API_TOKEN}`,
          },
          body: JSON.stringify({
            model: MODELO_TEXTO_APRESENTACAO,
            messages: [{ role: 'user', content: promptTexto }],
            // ACHADO ao vivo: sem isto, o endpoint compatível com OpenAI da
            // Cloudflare corta a resposta bem antes do JSON de 4-7 slides
            // terminar (o padrão é baixo demais pra esse tamanho de saída)
            // — o array chegava cortado no meio de um campo, e
            // `interpretarRespostaApresentacao` rejeitava (corretamente,
            // por ser JSON inválido) toda vez, sem nenhuma forma de dar
            // certo. Generoso o bastante pra 7 slides de JSON não cortar.
            max_tokens: 3000,
          }),
        },
      );
    }

    let respostaTexto = await chamarCloudflareTexto();
    if (respostaTexto.status === 429 || respostaTexto.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      respostaTexto = await chamarCloudflareTexto();
    }
    if (!respostaTexto.ok) {
      const corpo = await respostaTexto.text();
      console.error('gerar-apresentacao: IA de texto recusou', respostaTexto.status, corpo);
      const mensagemErro =
        respostaTexto.status === 429 || respostaTexto.status === 503
          ? 'A IA está sobrecarregada agora — tenta de novo em alguns segundos.'
          : 'Não deu pra gerar a apresentação agora.';
      return respostaJson({ error: mensagemErro }, 502, origin);
    }

    const dadosTexto = await respostaTexto.json();
    const textoResposta = dadosTexto.choices?.[0]?.message?.content ?? '';
    if (!textoResposta) {
      return respostaJson({ error: 'A IA não conseguiu montar a apresentação.' }, 502, origin);
    }

    let planoSlides;
    try {
      planoSlides = interpretarRespostaApresentacao(textoResposta);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não deu pra ler o plano de slides.';
      console.error('gerar-apresentacao: plano de slides malformado', textoResposta);
      return respostaJson({ error: mensagem }, 502, origin);
    }

    // Passo 2: cria a apresentação (linha "pai") já pra ter o id antes
    // de gerar/subir as imagens — cada slide referencia esse id.
    const { data: apresentacao, error: apresentacaoError } = await admin
      .from('apresentacoes')
      .insert({ aluno_id: user.id, materia_id: materiaId, topico })
      .select('id, criado_em')
      .single();
    if (apresentacaoError || !apresentacao) {
      console.error('gerar-apresentacao: falha ao criar apresentação', apresentacaoError);
      return respostaJson({ error: 'Não deu pra salvar a apresentação.' }, 500, origin);
    }

    // Passo 3: gera e sobe uma imagem por slide, EM PARALELO (Flux
    // Schnell é rápido — 4 passos de difusão por padrão — então gerar
    // em paralelo em vez de em sequência corta bastante o tempo total
    // de espera do aluno). Falha em UMA imagem não derruba a
    // apresentação inteira — esse slide só fica sem imagem
    // (`midia_url: null`), a UI mostra um placeholder.
    async function gerarImagemSlide(promptImagem: string): Promise<string | null> {
      try {
        const resposta = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODELO_IMAGEM_APRESENTACAO}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${CF_API_TOKEN}`,
            },
            body: JSON.stringify({ prompt: montarPromptImagemSlide(promptImagem) }),
          },
        );
        if (!resposta.ok) {
          console.error('gerar-apresentacao: IA de imagem recusou', resposta.status, await resposta.text());
          return null;
        }
        const dados = await resposta.json();
        const base64: string | undefined = dados?.result?.image;
        return base64 || null;
      } catch (err) {
        console.error('gerar-apresentacao: erro gerando imagem do slide', err);
        return null;
      }
    }

    const imagensBase64 = await Promise.all(
      planoSlides.map((slide) => gerarImagemSlide(slide.promptImagem)),
    );

    const slidesParaInserir = await Promise.all(
      planoSlides.map(async (slide, indice) => {
        const base64 = imagensBase64[indice];
        let midiaUrl: string | null = null;
        if (base64) {
          const caminho = `${user.id}/${apresentacao.id}/${indice}.jpg`;
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const { error: uploadError } = await admin.storage
            .from(BUCKET_APRESENTACOES)
            .upload(caminho, bytes, { contentType: 'image/jpeg' });
          if (!uploadError) midiaUrl = caminho;
          else console.error('gerar-apresentacao: falha ao subir imagem', uploadError);
        }
        return {
          apresentacao_id: apresentacao.id,
          ordem: indice,
          titulo: slide.titulo,
          topicos: slide.topicos,
          midia_url: midiaUrl,
        };
      }),
    );

    const { error: slidesError } = await admin.from('apresentacao_slides').insert(slidesParaInserir);
    if (slidesError) {
      console.error('gerar-apresentacao: falha ao salvar slides', slidesError);
      return respostaJson({ error: 'Não deu pra salvar os slides da apresentação.' }, 500, origin);
    }

    return respostaJson(
      {
        id: apresentacao.id,
        topico,
        criadoEm: apresentacao.criado_em,
        slides: slidesParaInserir.map((s) => ({
          ordem: s.ordem,
          titulo: s.titulo,
          topicos: s.topicos,
          midiaUrl: s.midia_url,
        })),
      },
      200,
      origin,
    );
  } catch (err) {
    console.error('gerar-apresentacao falhou:', err);
    return respostaJson({ error: 'internal_error' }, 500, origin);
  }
});
