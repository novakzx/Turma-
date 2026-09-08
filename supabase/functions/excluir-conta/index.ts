// Edge Function: exclusão de conta (brief original, seção 7 — "Aluno pode
// excluir a própria conta e isso apaga o histórico de mensagens dele").
// Chamada direto do app (`supabase.functions.invoke`), então precisa do
// mesmo tratamento de CORS que `chat-estudo` — ver comentário lá.
//
// Por que precisa de Edge Function em vez do app chamar o Supabase
// direto: apagar uma linha de `auth.users` só é possível com a service
// role (`auth.admin.deleteUser`), que nunca pode existir no cliente (regra
// de ouro do projeto). `profiles.id` referencia `auth.users(id) on delete
// cascade`, e o resto do schema (posts, mensagens, avaliações, flashcards,
// stories...) já cascade a partir de `profiles` — apagar o usuário no Auth
// é o suficiente pra limpar tudo (confirmado consultando
// `information_schema.referential_constraints` antes de escrever isto,
// não assumido).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ORIGENS_PERMITIDAS = ['https://turma-rho.vercel.app', 'http://localhost:8081'];

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respostaJson({ error: 'Sem autenticação.' }, 401, origin);
    }

    // Client "como o usuário" só pra confirmar quem está chamando —
    // nunca confia em nenhum id vindo do corpo da requisição, só no que o
    // próprio JWT resolve (`getUser`).
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
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return respostaJson({ ok: true }, 200, origin);
  } catch (err) {
    // Detalhe de verdade só no log -- nunca na resposta (mesmo padrão das
    // outras Edge Functions, ver `chat-estudo`).
    console.error('excluir-conta falhou:', err);
    return respostaJson({ error: 'internal_error' }, 500, origin);
  }
});
