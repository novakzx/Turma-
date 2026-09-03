import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { registrarPushToken } from '@/features/notificacoes/pushToken';

export default function AppLayout() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    // Silencioso de propósito: falha de permissão/token não deve travar
    // o app, só significa que esse device não recebe push (ver comentário
    // em pushToken.ts sobre simulador e EAS projectId ausente).
    registrarPushToken(session.user.id).catch((err) => {
      console.error('registrarPushToken falhou', err);
    });
  }, [session]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="novo-aviso" options={{ presentation: 'modal', title: 'Novo aviso' }} />
      <Stack.Screen name="novo-post" options={{ presentation: 'modal', title: 'Novo post' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
      <Stack.Screen name="sala/[id]" options={{ title: 'Sala de chat' }} />
    </Stack>
  );
}
