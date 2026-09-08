// Edge Function: abre o Stripe Billing Portal pra quem já é assinante
// gerenciar a própria assinatura (trocar cartão, ver fatura, cancelar).
// Mesmo padrão de CORS/auth de `assinatura-checkout` — ver comentário lá.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^18';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

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
    if (!STRIPE_SECRET_KEY) {
      return respostaJson(
        { error: 'Assinatura ainda não foi configurada (falta STRIPE_SECRET_KEY).' },
        503,
        origin,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respostaJson({ error: 'Sem autenticação.' }, 401, origin);
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

    const { data: perfil, error: perfilError } = await userClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (perfilError || !perfil?.stripe_customer_id) {
      return respostaJson({ error: 'Você ainda não tem assinatura pra gerenciar.' }, 400, origin);
    }

    const baseUrl =
      origin && ORIGENS_PERMITIDAS.includes(origin) ? origin : 'https://suaturma.vercel.app';

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const portal = await stripe.billingPortal.sessions.create({
      customer: perfil.stripe_customer_id,
      return_url: `${baseUrl}/assinatura`,
    });

    return respostaJson({ url: portal.url }, 200, origin);
  } catch (err) {
    console.error('assinatura-portal falhou:', err);
    return respostaJson({ error: 'Não deu pra abrir o portal. Tenta de novo.' }, 500, origin);
  }
});
