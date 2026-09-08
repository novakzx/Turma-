import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { registrarPushToken } from '@/features/notificacoes/pushToken';

export default function AppLayout() {
  const { session } = useAuth();
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';

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
    <Stack
      screenOptions={{
        // `headerShadowVisible: false` — sem isso o header nativo aplica
        // uma borda/sombra inferior clara própria por padrão (pensada pra
        // tema claro), que aparecia como linha branca sobre o fundo
        // escuro (achado testando no preview mobile, relatado pelo
        // usuário). `headerStyle` deste header não aceita
        // `borderBottomWidth` direto (erro de tipo) — esta é a prop
        // documentada do React Navigation pra isso.
        headerShadowVisible: false,
        headerStyle: { backgroundColor: escuro ? '#05060A' : '#0B0E14' },
        headerTintColor: '#F8FAFC',
        contentStyle: { backgroundColor: escuro ? '#05060A' : '#0B0E14' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="novo-post" options={{ presentation: 'modal', title: 'Novo post' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
      <Stack.Screen name="sala/[id]" options={{ title: 'Sala de chat' }} />
      <Stack.Screen
        name="editar-perfil"
        options={{ presentation: 'modal', title: 'Editar perfil' }}
      />
      <Stack.Screen name="minhas-publicacoes" options={{ title: 'Minhas publicações' }} />
      <Stack.Screen name="configuracoes" options={{ title: 'Configurações' }} />
      <Stack.Screen name="gerenciar-materias" options={{ title: 'Matérias' }} />
      <Stack.Screen name="pedidos-turma" options={{ title: 'Pedidos de entrada' }} />
      <Stack.Screen name="trocar-turma" options={{ title: 'Trocar de turma' }} />
      <Stack.Screen name="perfil/[id]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="conexoes/[id]" options={{ title: 'Conexões' }} />
      <Stack.Screen name="nova-story" options={{ presentation: 'modal', title: 'Nova story' }} />
      <Stack.Screen
        name="story/[id]"
        options={{ presentation: 'fullScreenModal', headerShown: false }}
      />
      <Stack.Screen name="conversa/[id]" options={{ title: 'Conversa' }} />
      <Stack.Screen
        name="nova-conversa"
        options={{ presentation: 'modal', title: 'Nova conversa' }}
      />
      <Stack.Screen name="grupo-participantes/[id]" options={{ title: 'Participantes' }} />
      <Stack.Screen name="moderacao-denuncias" options={{ title: 'Denúncias' }} />
      <Stack.Screen name="buscar-usuarios" options={{ title: 'Pesquisar' }} />
      <Stack.Screen name="flashcards" options={{ title: 'Flashcards' }} />
    </Stack>
  );
}
