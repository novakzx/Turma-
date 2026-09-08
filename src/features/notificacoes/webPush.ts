import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Chave pública VAPID (RFC 8292) deste projeto — gerada uma vez (par
 * completo salvo como secret `VAPID_KEYS_JWK` no Supabase, nunca no
 * código). Hardcoded de propósito, não `EXPO_PUBLIC_...`: é dado
 * público por definição (é literalmente pra isso que "público" existe
 * no nome VAPID — o navegador manda ela pro Push Service em toda
 * assinatura), e colocar como env var exigiria configurar isso também
 * no painel do Vercel (usuário teria que fazer manual, sem eu conseguir
 * setar por aqui) só pra guardar um valor que não é segredo nenhum.
 */
const VAPID_PUBLIC_KEY =
  'BBTUDbuIaWlnKBRgcQCWlEw7Lt07V4-E_Lz-dEsKiyZd0KFs1-YUE8Lz38ZEcXj-d7rR9AYVQD_xOvt3z9uUhJk';

const CAMINHO_SERVICE_WORKER = '/sw-push.js';

// `Uint8Array.from(...)` aqui tipa como `Uint8Array<ArrayBufferLike>`
// (inclui `SharedArrayBuffer`), que o TS mais recente não aceita como
// `BufferSource` pro `applicationServerKey` — `new Uint8Array(length)` +
// preencher via loop garante `Uint8Array<ArrayBuffer>` de verdade.
function base64UrlParaUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

/**
 * Push de verdade pro navegador/PWA (pedido do usuário) — Web Push
 * (RFC 8291), não o Expo Push Service: esse exige `eas init` (conta
 * Expo de verdade, ver README) que este projeto ainda não tem, e o app
 * hoje é acessado majoritariamente pelo navegador de qualquer forma.
 * `getExpoPushTokenAsync`/`expo-notifications` nem tenta rodar aqui —
 * usa a API de Push do navegador direto (`ServiceWorkerRegistration.
 * pushManager`), sem depender do caminho web legado do pacote (que é de
 * ~2020, sem manutenção recente e sem confirmação de que ainda funciona
 * contra o export web atual do Expo — ver commits do projeto).
 *
 * Silencioso em qualquer falta de suporte (Safari mais antigo, contexto
 * sem HTTPS/localhost, permissão negada) — só significa que esse
 * navegador não recebe push, não é erro de verdade.
 */
export async function registrarPushWeb(userId: string): Promise<void> {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  if (Notification.permission === 'default') {
    const resultado = await Notification.requestPermission();
    if (resultado !== 'granted') return;
  }
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register(CAMINHO_SERVICE_WORKER);
  await navigator.serviceWorker.ready;

  let assinatura = await registration.pushManager.getSubscription();
  if (!assinatura) {
    assinatura = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // `PushSubscriptionJSON` (o tipo de `.toJSON()`) não bate estrutural
  // com `Json` (o tipo genérico da coluna `jsonb`, que exige um índice
  // de string) — monta o objeto explícito com só os 3 campos que
  // `enviar-push`/`@negrel/webpush` realmente usam, em vez de forçar o
  // tipo inteiro do browser pra dentro de `Json`.
  const assinaturaJson = assinatura.toJSON();
  const { error } = await supabase
    .from('profiles')
    .update({
      assinatura_push_web: {
        endpoint: assinaturaJson.endpoint,
        keys: assinaturaJson.keys,
      },
    })
    .eq('id', userId);
  if (error) throw error;
}
