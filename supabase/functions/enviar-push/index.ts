// Edge Function: envia Web Push de verdade (RFC 8291/8292) — chamada
// pelos triggers de banco em `private.notificar_push` (migration
// `push_web_notificacoes`), nunca direto do app (mesma arquitetura das
// outras Edge Functions "internas": `notificar-aviso`/`aviso-clima`).
//
// Usa `@negrel/webpush` (JSR, feito pra Deno/edge — sem depender do
// compat de `npm:` pra bibliotecas Node como `web-push`, que fazem
// coisa específica de Node internamente). VAPID_KEYS_JWK é o par de
// chaves gerado uma vez (ver histórico do commit) e salvo como secret.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_INTERNAL_SECRET');
const VAPID_KEYS_JWK = Deno.env.get('VAPID_KEYS_JWK');

// Contato de verdade só importa se um Push Service (Mozilla/Google)
// precisar avisar sobre abuso/erro de configuração — não aparece pra
// nenhum usuário do app. Domínio já verificado do projeto (mesmo do
// SMTP do Resend, ver README).
const CONTATO_VAPID = 'mailto:contato@suaturma.com';

type AssinaturaWeb = { endpoint: string; keys: { p256dh: string; auth: string } };

let appServerPromise: Promise<InstanceType<typeof webpush.ApplicationServer>> | null = null;

/** Uma só `ApplicationServer` reaproveitada entre chamadas (dentro do
 * tempo de vida do isolate) — criar de novo a cada request refaria a
 * geração da chave ECDH do servidor à toa. */
function obterApplicationServer() {
  if (!appServerPromise) {
    if (!VAPID_KEYS_JWK) {
      throw new Error('VAPID_KEYS_JWK não configurado.');
    }
    appServerPromise = (async () => {
      const vapidKeys = await webpush.importVapidKeys(JSON.parse(VAPID_KEYS_JWK), {
        extractable: false,
      });
      return webpush.ApplicationServer.new({
        contactInformation: CONTATO_VAPID,
        vapidKeys,
      });
    })();
  }
  return appServerPromise;
}

Deno.serve(async (req) => {
  try {
    // Mesmo mecanismo de segurança de `notificar-aviso`: só quem sabe o
    // segredo do Vault (só os triggers de banco) consegue chamar isto.
    if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    const perfilIds = payload?.perfilIds as string[] | undefined;
    const titulo = payload?.titulo as string | undefined;
    const corpo = (payload?.corpo as string | undefined) ?? '';
    const dados = payload?.dados ?? {};

    if (!perfilIds?.length || !titulo) {
      return new Response(JSON.stringify({ error: 'payload inválido' }), { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: perfis, error } = await admin
      .from('profiles')
      .select('id, assinatura_push_web')
      .in('id', perfilIds)
      .not('assinatura_push_web', 'is', null);
    if (error) throw error;

    const appServer = await obterApplicationServer();
    const mensagem = JSON.stringify({ title: titulo, body: corpo, data: dados });

    let enviados = 0;
    for (const perfil of perfis ?? []) {
      const assinatura = perfil.assinatura_push_web as AssinaturaWeb;
      try {
        const subscriber = appServer.subscribe(assinatura);
        await subscriber.pushTextMessage(mensagem, {});
        enviados++;
      } catch (err) {
        // 410 = a assinatura não existe mais (usuário desinstalou,
        // limpou dados do navegador, etc.) — limpa pra não tentar de
        // novo pra sempre. Qualquer outro erro só loga (não derruba o
        // envio pros outros destinatários do lote).
        if (err instanceof webpush.PushMessageError && err.isGone()) {
          await admin.from('profiles').update({ assinatura_push_web: null }).eq('id', perfil.id);
        } else {
          console.error('enviar-push: falha enviando pra um destinatário', perfil.id, err);
        }
      }
    }

    return new Response(JSON.stringify({ enviados, total: perfis?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('enviar-push falhou:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
});
