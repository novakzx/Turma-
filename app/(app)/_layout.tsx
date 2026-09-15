import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useTema } from '@/features/configuracoes/TemaProvider';
import { registrarPushToken } from '@/features/notificacoes/pushToken';
import { registrarPushWeb } from '@/features/notificacoes/webPush';

export default function AppLayout() {
  const { session } = useAuth();
  const { escuro } = useTema();

  useEffect(() => {
    if (!session) return;
    // Silencioso de propósito: falha de permissão/token não deve travar
    // o app, só significa que esse device não recebe push (ver comentário
    // em pushToken.ts sobre simulador e EAS projectId ausente).
    registrarPushToken(session.user.id).catch((err) => {
      console.error('registrarPushToken falhou', err);
    });
    // Web/PWA — caminho que funciona de verdade hoje (ver webPush.ts:
    // o nativo acima ainda não tem EAS configurado, então não entrega
    // nada por enquanto). Mesmo tratamento silencioso de erro.
    registrarPushWeb(session.user.id).catch((err) => {
      console.error('registrarPushWeb falhou', err);
    });
  }, [session]);

  return (
    <Stack
      screenOptions={{
        // `headerShadowVisible: false` — a sombra padrão do React
        // Navigation não bate com a sombra suave do resto do redesign v5
        // (ver comentário em `app/_layout.tsx`).
        //
        // ACHADO ao vivo (pedido do usuário — "mais flat e mais simples"
        // levou a testar o app em modo escuro de novo): este `<Stack>`
        // TEM SEU PRÓPRIO `screenOptions` (é uma segunda Stack, aninhada
        // dentro de `(app)`, separada da raiz em `app/_layout.tsx`) —
        // hardcoded pro claro desde sempre, nunca reagia ao tema.
        // Qualquer tela dentro do grupo `(app)` que usa header do React
        // Navigation (post/[id], sala/[id], editar-perfil, novo-post...)
        // ficava com uma barra clara no topo mesmo com o app inteiro em
        // modo escuro — só não tinha sido notado porque a maioria dessas
        // telas usa `headerShown: false` ou raramente é aberta durante
        // teste manual. Corrigido lendo `useTema()`, mesmo padrão já
        // usado na Stack raiz.
        headerShadowVisible: false,
        headerStyle: { backgroundColor: escuro ? '#0A0A0A' : '#FAFAFA' },
        headerTintColor: escuro ? '#F5F5F5' : '#000000',
        contentStyle: { backgroundColor: escuro ? '#0A0A0A' : '#FAFAFA' },
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
      <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
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
      <Stack.Screen name="ferramentas-estudo" options={{ title: 'Ferramentas' }} />
      <Stack.Screen name="apresentacoes" options={{ title: 'Apresentações' }} />
      <Stack.Screen name="apresentacao/[id]" options={{ title: 'Apresentação' }} />
    </Stack>
  );
}
