// Edge Function: login por @usuário sem o e-mail real passar pelo
// navegador (auditoria de segurança pedida pelo usuário — ver migration
// `login_sem_vazar_email_e_limita_grupo`).
//
// Antes, o cliente chamava a RPC `email_por_nome_usuario` (security
// definer, aberta pro `anon`) pra descobrir o e-mail de verdade por trás
// do @usuário, e só então chamava `signInWithPassword` ele mesmo. Isso
// tinha rate limit (20/10min por IP), mas ainda entregava e-mail real de
// aluno menor de idade pra qualquer IP não-bloqueado que soubesse (ou
// adivinhasse) o @usuário. Essa função faz o fluxo inteiro server-side:
// resolve o e-mail com a service role (nunca sai daqui), chama o próprio
// endpoint de login do GoTrue por baixo, e devolve só a sessão (tokens)
// pro cliente — o e-mail nunca aparece numa resposta de rede que o
// navegador (ou alguém inspecionando o tráfego) consiga ler.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Mesma lista de `chat-estudo/index.ts` -- únicas origens de verdade
// deste projeto. Ver comentário lá sobre por que `*` não entra aqui.
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
  if (req.method !== 'POST') {
    return respostaJson({ error: 'method_not_allowed' }, 405, origin);
  }

  let corpo: { nomeUsuario?: unknown; senha?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return respostaJson({ error: 'JSON inválido.' }, 400, origin);
  }

  const nomeUsuario = typeof corpo.nomeUsuario === 'string' ? corpo.nomeUsuario.trim() : '';
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!nomeUsuario || !senha) {
    return respostaJson({ error: 'Usuário e senha são obrigatórios.' }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // `cf-connecting-ip` é posto pela borda Cloudflare do próprio Supabase
  // (não pelo chamador) -- mesma fonte de IP já confiável usada pelo
  // rate limit das outras RPCs (ver SECURITY.md §7).
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'sem-ip';

  const { data: email, error: erroResolver } = await admin.rpc('resolver_email_login', {
    p_nome_usuario: nomeUsuario,
    p_ip: ip,
  });

  if (erroResolver) {
    // Só o rate limit da RPC chega aqui como erro -- mensagem genérica,
    // não distingue de credenciais erradas (não dá pista se o @usuário
    // existe).
    return respostaJson(
      { error: 'Muitas tentativas -- espera um pouco antes de tentar de novo.' },
      429,
      origin,
    );
  }

  // @usuário não existe: chama o GoTrue mesmo assim com um e-mail
  // qualquer que nunca vai bater -- devolve exatamente o mesmo erro e
  // (aproximadamente) o mesmo tempo de resposta de uma senha errada,
  // então a resposta não vaza se o @usuário existe ou não.
  const emailParaLogin = email ?? `sem-usuario-${crypto.randomUUID()}@turmamais.invalid`;

  const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: emailParaLogin, password: senha }),
  });
  const tokenData = await tokenResp.json();

  if (!tokenResp.ok) {
    return respostaJson({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }

  // `tokenData` já vem no formato que `supabase-js` espera pra
  // `setSession` ({ access_token, refresh_token, ... }) -- repassa direto.
  return respostaJson(tokenData, 200, origin);
});
