// Edge Function: tradução automática de post (pedido do usuário — útil
// pra aluno de intercâmbio/imigrante lendo o feed da turma). Mesma
// arquitetura de `chat-estudo`: chamada direto do app, CORS por
// allow-list, rate limit por usuário (API paga), erro genérico pro
// cliente. Não usa `chat_ia_mensagens` (é conversa de estudo, não
// tradução) — conta em cima de `traducoes_uso`, criada só pra isso (ver
// migration `traducoes_uso`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const TEXTO_TAMANHO_MAXIMO = 2000;
const LIMITE_TRADUCOES = 30;
const JANELA_LIMITE_MS = 10 * 60 * 1000;

// Domínio de produção corrigido pra `suaturma.vercel.app` — ver o
// comentário completo em `chat-estudo/index.ts` sobre o achado.
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
    if (!GEMINI_API_KEY) {
      return respostaJson(
        { error: 'Tradução ainda não foi configurada (falta GEMINI_API_KEY).' },
        503,
        origin,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respostaJson({ error: 'Sem autenticação.' }, 401, origin);
    }

    const payload = await req.json();
    const texto = (payload?.texto as string | undefined)?.trim();
    const idioma = (payload?.idioma as string | undefined)?.trim();

    if (!texto || !idioma) {
      return respostaJson({ error: 'payload inválido' }, 400, origin);
    }
    if (texto.length > TEXTO_TAMANHO_MAXIMO) {
      return respostaJson({ error: 'Texto muito longo pra traduzir.' }, 400, origin);
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

    // Rate limit por usuário — mesma ideia do `chat-estudo`, contando na
    // tabela dedicada em vez do histórico de chat.
    const { count: recentes } = await userClient
      .from('traducoes_uso')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', user.id)
      .gte('criado_em', new Date(Date.now() - JANELA_LIMITE_MS).toISOString());
    if ((recentes ?? 0) >= LIMITE_TRADUCOES) {
      return respostaJson(
        { error: 'Muitas traduções em pouco tempo — espera um pouco antes de tentar de novo.' },
        429,
        origin,
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: insertError } = await admin.from('traducoes_uso').insert({ aluno_id: user.id });
    if (insertError) console.error('traduzir-texto: falha ao registrar uso', insertError);

    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  `Traduza o texto do usuário pra ${idioma}. Devolva só a tradução, sem ` +
                  'nenhum comentário, aspas ou explicação extra.',
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: texto }] }],
        }),
      },
    );

    if (!resposta.ok) {
      console.error('traduzir-texto: Gemini recusou', resposta.status, await resposta.text());
      return respostaJson({ error: 'Não deu pra traduzir agora.' }, 502, origin);
    }

    const dados = await resposta.json();
    const traducao: string =
      dados.candidates?.[0]?.content?.parts
        ?.map((bloco: { text?: string }) => bloco.text ?? '')
        .join('\n')
        .trim() ?? '';

    if (!traducao) {
      return respostaJson({ error: 'A tradução veio vazia — tenta de novo.' }, 502, origin);
    }

    return respostaJson({ traducao }, 200, origin);
  } catch (err) {
    console.error('traduzir-texto falhou:', err);
    return respostaJson({ error: 'internal_error' }, 500, origin);
  }
});
