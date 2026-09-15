// Edge Function: lista/apaga inscrições de acesso antecipado (pedido do
// usuário: painel separado com senha simples, sem precisar logar como
// coordenação). Usa a service role pra ler a tabela
// `inscricoes_lancamento`, que de propósito não tem nenhuma policy de
// select/delete pra anon/authenticated -- só service role enxerga (ver
// migration `inscricoes_lancamento`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENHA_ADMIN = Deno.env.get('ADMIN_LANCAMENTO_SENHA');

// Mesma lista de `chat-estudo/index.ts` -- únicas origens de verdade
// deste projeto.
const ORIGENS_PERMITIDAS = ['https://suaturma.vercel.app', 'http://localhost:8081'];

function corsHeaders(origin: string | null) {
  const permitida = origin && ORIGENS_PERMITIDAS.includes(origin);
  return {
    ...(permitida ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-admin-senha',
    Vary: 'Origin',
  };
}

function respostaJson(corpo: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

// Comparação em tempo constante -- evita vazar, por timing, quantos
// caracteres da senha já bateram.
function senhaConfere(enviada: string, esperada: string) {
  if (enviada.length !== esperada.length) return false;
  let diff = 0;
  for (let i = 0; i < enviada.length; i++) {
    diff |= enviada.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (!SENHA_ADMIN) {
    return respostaJson(
      { error: 'Painel não configurado -- falta o segredo ADMIN_LANCAMENTO_SENHA no projeto.' },
      500,
      origin,
    );
  }

  const senhaEnviada = req.headers.get('x-admin-senha') ?? '';
  if (!senhaEnviada || !senhaConfere(senhaEnviada, SENHA_ADMIN)) {
    return respostaJson({ error: 'Senha incorreta.' }, 401, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('inscricoes_lancamento')
      .select('id, nome, telefone, email, criado_em')
      .order('criado_em', { ascending: false });

    if (error) return respostaJson({ error: 'Erro ao buscar inscrições.' }, 500, origin);
    return respostaJson({ inscricoes: data }, 200, origin);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return respostaJson({ error: 'id é obrigatório.' }, 400, origin);

    const { error } = await admin.from('inscricoes_lancamento').delete().eq('id', id);
    if (error) return respostaJson({ error: 'Erro ao apagar inscrição.' }, 500, origin);
    return respostaJson({ ok: true }, 200, origin);
  }

  return respostaJson({ error: 'method_not_allowed' }, 405, origin);
});
