// Service worker só pra Web Push (RFC 8291) — registrado por
// `registrarPushWeb` em src/features/notificacoes/webPush.ts. Não
// intercepta `fetch` nem faz cache de nada (não é um service worker de
// "modo offline" — o app já tem o dele próprio via TanStack Query, ver
// src/lib/offlinePersist.ts); só existe pra receber push em segundo
// plano, que exige um service worker registrado mesmo com a aba
// fechada.

self.addEventListener('push', (event) => {
  let dados = { title: 'Turma+', body: '' };
  try {
    dados = event.data ? event.data.json() : dados;
  } catch {
    // Corpo não era JSON (não deveria acontecer, `enviar-push` sempre
    // manda JSON) — mostra alguma coisa em vez de quebrar silenciosamente.
    dados = { title: 'Turma+', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(dados.title || 'Turma+', {
      body: dados.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: dados.data || {},
    }),
  );
});

// Toca na notificação -> foca uma aba já aberta do app, ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if ('focus' in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    }),
  );
});
