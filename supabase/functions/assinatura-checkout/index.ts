// Edge Function: cria uma Stripe Checkout Session pra assinatura do
// Turma+ Premium (R$2,99/mês — IA sem limite + selo de verificado, ver
// migration `assinatura_stripe`). Chamada direto do app
// (`supabase.functions.invoke`), então precisa do mesmo tratamento de
// CORS que `chat-estudo` — ver comentário lá.
//
// Preço definido *aqui* via `price_data` inline em vez de um Price
// pré-criado no dashboard do Stripe — evita um passo manual a mais de
// setup (criar produto/preço na Stripe antes de configurar o app). Só
// duas secrets são necessárias: `STRIPE_SECRET_KEY` e
// `STRIPE_WEBHOOK_SECRET` (esta última só usada por `stripe-webhook`).
//
// Nenhuma chave da Stripe chega ao app — regra de ouro do projeto (ver
// README > "Segurança e privacidade").
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^18';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const PRECO_CENTAVOS = 299; // R$2,99
const NOME_PRODUTO = 'Turma+ Premium';
const DESCRICAO_PRODUTO = 'IA de estudo sem limite diário + selo de verificado no perfil.';
// "Software as a service (SaaS) - personal use" — a conta Stripe tem
// Managed Payments ligado por padrão, que exige um product tax code
// elegível em todo `price_data` inline (achado ao vivo: sem isso, a
// Checkout Session falha com "the product tax code is missing").
// Assinante daqui é sempre pessoa física (aluno), nunca empresa — daí
// o "personal use", não o "business use" (ver docs.stripe.com/tax/
// products-prices-tax-codes-tax-behavior).
const TAX_CODE_SAAS_PESSOA_FISICA = 'txcd_10103000';

// Mesma lista de `chat-estudo`/`excluir-conta` — domínio de produção
// corrigido pra `suaturma.vercel.app` (ver histórico).
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
      .select('id, email, assinatura_ativa, stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (perfilError || !perfil) {
      return respostaJson({ error: 'Perfil não encontrado.' }, 404, origin);
    }
    if (perfil.assinatura_ativa) {
      return respostaJson({ error: 'Você já é assinante.' }, 400, origin);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Reaproveita o Customer da Stripe se essa conta já tentou assinar
    // antes (ex.: cancelou o checkout no meio e voltou) — evita cliente
    // duplicado pro mesmo usuário a cada tentativa.
    let customerId = perfil.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: perfil.email,
        metadata: { perfil_id: perfil.id },
      });
      customerId = customer.id;

      // GRANT UPDATE de `profiles` não inclui `stripe_customer_id` pro
      // usuário comum (ver migration `assinatura_stripe`) — precisa da
      // service role aqui, mesmo sendo o próprio dono do perfil.
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', perfil.id);
    }

    const baseUrl =
      origin && ORIGENS_PERMITIDAS.includes(origin) ? origin : 'https://suaturma.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: PRECO_CENTAVOS,
            recurring: { interval: 'month' },
            product_data: {
              name: NOME_PRODUTO,
              description: DESCRICAO_PRODUTO,
              tax_code: TAX_CODE_SAAS_PESSOA_FISICA,
            },
          },
          quantity: 1,
        },
      ],
      // `metadata` na Session cobre o `checkout.session.completed`;
      // repetir em `subscription_data.metadata` copia o mesmo dado pro
      // objeto Subscription — assim `customer.subscription.updated`/
      // `.deleted` também carregam `perfil_id` direto, sem precisar de
      // um join por `stripe_customer_id` a cada evento do webhook.
      metadata: { perfil_id: perfil.id },
      subscription_data: { metadata: { perfil_id: perfil.id } },
      success_url: `${baseUrl}/assinatura?sucesso=1`,
      cancel_url: `${baseUrl}/assinatura?cancelado=1`,
    });

    return respostaJson({ url: session.url }, 200, origin);
  } catch (err) {
    console.error('assinatura-checkout falhou:', err);
    return respostaJson({ error: 'Não deu pra iniciar o checkout. Tenta de novo.' }, 500, origin);
  }
});
