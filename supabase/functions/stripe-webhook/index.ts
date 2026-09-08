// Edge Function: recebe os webhooks da Stripe pra manter
// `profiles.assinatura_ativa` sincronizada com o que realmente está
// pago (nunca confie no que o app diz — o app nem tem permissão de
// GRANT UPDATE nessas colunas, ver migration `assinatura_stripe`).
//
// Não usa JWT do Supabase (a Stripe não manda um) — a autenticação aqui
// é a verificação de assinatura HMAC do próprio payload, com a chave
// `STRIPE_WEBHOOK_SECRET` (gerada pelo dashboard da Stripe ao criar o
// endpoint, ver README). Por isso essa função precisa ser implantada
// com `verify_jwt: false`.
//
// `createSubtleCryptoProvider()` + `constructEventAsync` (em vez do
// `constructEvent` síncrono) porque o Deno não tem o módulo `crypto`
// nativo do Node que o SDK da Stripe usa por padrão — a variante Web
// Crypto assíncrona é a documentada pra edge runtimes (verificado
// direto no exemplo oficial da Supabase antes de escrever isto, não
// assumido).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^18';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
// Mesmo secret que `notificar-aviso`/`aviso-clima`/`enviar-push` já
// usam pra chamada interna servidor-a-servidor — reaproveitado aqui
// (já é uma secret do projeto inteiro, não precisa gerar outra).
const WEBHOOK_INTERNAL_SECRET = Deno.env.get('WEBHOOK_INTERNAL_SECRET');

const cryptoProvider = STRIPE_SECRET_KEY ? Stripe.createSubtleCryptoProvider() : null;

/** Best-effort — se o push falhar (usuário sem assinatura de push, ou
 * `enviar-push` fora do ar), a assinatura em si já foi ativada e salva;
 * um push perdido não é motivo pra falhar o webhook (a Stripe reentrega
 * webhook com erro, e reativar/reprocessar de novo não deveria mandar
 * push duplicado à toa). */
async function avisarPush(perfilId: string, titulo: string, corpo: string) {
  if (!WEBHOOK_INTERNAL_SECRET) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_INTERNAL_SECRET },
      body: JSON.stringify({ perfilIds: [perfilId], titulo, corpo, dados: { tipo: 'assinatura' } }),
    });
  } catch (err) {
    console.error('stripe-webhook: falha ao avisar por push', err);
  }
}

function periodoAtual(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const fim = item?.current_period_end ?? null;
  return fim ? new Date(fim * 1000).toISOString() : null;
}

Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !cryptoProvider) {
      return new Response(JSON.stringify({ error: 'Webhook ainda não configurado.' }), {
        status: 503,
      });
    }

    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Sem assinatura.' }), { status: 400 });
    }

    // `.text()` (não `.json()`) — a verificação HMAC precisa do corpo
    // bruto exatamente como a Stripe assinou; reserializar o JSON
    // parseado pode mudar espaçamento/ordem de chave e invalidar a
    // assinatura.
    const body = await req.text();
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
        undefined,
        cryptoProvider,
      );
    } catch (err) {
      console.error('stripe-webhook: assinatura inválida', err);
      return new Response(JSON.stringify({ error: 'Assinatura inválida.' }), { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    switch (event.type) {
      // Primeira cobrança confirmada — a assinatura em si (status
      // "active"/"trialing") é sincronizada pelo `customer.subscription.*`
      // abaixo, que a Stripe sempre dispara junto; aqui só cuidamos do
      // que só o Checkout Session tem (o link de volta pro `perfil_id`
      // já vem de `subscription_data.metadata`, mas o `session.metadata`
      // é o fallback caso a Subscription ainda não tenha propagado).
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const perfilId = session.metadata?.perfil_id;
        if (perfilId) {
          await avisarPush(
            perfilId,
            'Assinatura Turma+ ativada 🎉',
            'Sua IA agora é sem limites e seu perfil já está verificado.',
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const perfilId = subscription.metadata?.perfil_id;
        if (!perfilId) {
          console.error('stripe-webhook: subscription sem perfil_id em metadata', subscription.id);
          break;
        }
        const ativa = subscription.status === 'active' || subscription.status === 'trialing';
        await admin
          .from('profiles')
          .update({
            assinatura_ativa: ativa,
            assinatura_valido_ate: periodoAtual(subscription),
            stripe_subscription_id: subscription.id,
          })
          .eq('id', perfilId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const perfilId = subscription.metadata?.perfil_id;
        if (!perfilId) break;
        await admin
          .from('profiles')
          .update({ assinatura_ativa: false })
          .eq('id', perfilId);
        break;
      }

      default:
        // Outros eventos (invoice.*, payment_intent.*, etc.) não
        // importam pro que o app usa — ignorados sem erro, a Stripe só
        // exige 2xx pra não reentregar.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-webhook falhou:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
});
