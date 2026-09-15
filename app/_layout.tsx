import '@/lib/global.css';
import '@/lib/nativewindAnimated';
// Registra o handler do widget de tela inicial (Android) por efeito
// colateral — precisa rodar assim que o bundle carrega, pro
// `AppRegistry.registerHeadlessTask` já estar pronto quando o sistema
// operacional pedir pra desenhar o widget. A lib já é segura de
// importar em qualquer plataforma (fica noop fora do Android, ver
// `AndroidWidget.js` da própria lib) — sem isso, importar aqui exigiria
// um `if (Platform.OS === 'android')` que a lib já faz por dentro.
import '@/features/widget/task';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisosWeb } from '@/components/ui/AvisosWeb';
import { BannerOffline } from '@/components/ui/BannerOffline';
import { PromptInstalarPWA } from '@/components/ui/PromptInstalarPWA';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { TemaProvider, useTema } from '@/features/configuracoes/TemaProvider';
import { OFFLINE_PERSIST_OPTIONS } from '@/lib/offlinePersist';
import { queryClient } from '@/lib/queryClient';

/**
 * Decide qual grupo de rotas mostrar com base em sessão + perfil: sem
 * sessão → (auth); com sessão mas sem nome de usuário/idade/termos
 * (só acontece no primeiro login social — Google/Apple não dão esses
 * dados, diferente do cadastro normal que já exige tudo antes de criar a
 * conta) → (completar-cadastro); com sessão e cadastro completo mas sem
 * escola/turma → (onboarding); com tudo completo → (app).
 * `Stack.Protected` troca de grupo sozinho quando `session`/`profile`
 * mudam (login, logout, fim de cadastro/onboarding) — nenhuma navegação
 * manual é necessária nas telas.
 *
 * Modo escuro de verdade (pedido do usuário) roda por `<TemaProvider>`
 * (ver `src/features/configuracoes/TemaProvider.tsx`) — não pelo
 * `useColorScheme()` do NativeWind: as classes `dark:` dele são inertes
 * no alvo web (confirmado ao vivo, ver comentário grande em
 * `src/lib/global.css`), então o tema aqui é resolvido via variável CSS
 * (web) / `vars()` (nativo), ambos lidos da mesma paleta em
 * `src/lib/temaCores.ts`.
 */
function RootNavigator() {
  const { escuro, cores } = useTema();
  const { session, profile, isLoadingSession, isLoadingProfile } = useAuth();

  if (isLoadingSession || (!!session && isLoadingProfile)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={cores.primary} />
      </View>
    );
  }

  const cadastroCompleto =
    !!profile?.nome_usuario && profile?.idade != null && !!profile?.termos_aceitos_em;
  const onboardingCompleto = !!profile?.escola_id && !!profile?.turma_id;

  return (
    // `AvisosWeb` fica de propósito FORA do `Stack` mas DENTRO desta coluna
    // flex — como uma linha normal do layout (não `position: absolute`),
    // ela empurra o Stack (que é `flex: 1`) pra cima em vez de cobrir por
    // cima o que já está renderizado. Testando o cadastro de verdade: com
    // o banner em `position: absolute` (versão anterior), ele tampava
    // fisicamente o botão "Criar conta" no fim de um formulário longo —
    // o clique nem chegava no botão, sem erro nenhum no console.
    <View className="flex-1">
      {/* `style` do ícone da barra de status (bateria/hora do sistema) —
          "dark" pede ícone escuro (fundo claro), "light" pede ícone claro
          (fundo escuro). Trocado pra reagir a `escuro` de verdade agora
          que o tema muda de fato — antes ficava travado em "dark" porque
          o fundo também estava travado em claro. */}
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <BannerOffline />
      <PromptInstalarPWA />
      <View className="flex-1">
        <Stack
          screenOptions={{
            // `headerShadowVisible: false` — o header do React Navigation
            // traz uma borda/sombra inferior própria por padrão; sem
            // desligar isso ela aparece como linha duplicada sobre o
            // fundo. Este header em si nunca chega a renderizar de
            // verdade (todo filho aqui usa `headerShown: false` e tem o
            // próprio Stack/Tabs) — mantido consistente mesmo assim.
            headerShadowVisible: false,
            headerStyle: { backgroundColor: escuro ? '#0B0E14' : '#FAF8FF' },
            headerTintColor: escuro ? '#F1F5F9' : '#131B2E',
            contentStyle: { backgroundColor: escuro ? '#0B0E14' : '#FAF8FF' },
          }}
        >
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session && !cadastroCompleto}>
            <Stack.Screen name="(completar-cadastro)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session && cadastroCompleto && !onboardingCompleto}>
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session && cadastroCompleto && onboardingCompleto}>
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </View>
      <AvisosWeb />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Modo offline básico (pedido do usuário): persiste no
            `AsyncStorage` só o que é seguro mostrar desatualizado sem
            aviso (matérias, notas, chat de estudo, flashcards — ver
            `src/lib/offlinePersist.ts` pro porquê de feed/chat ficarem de
            fora). Troca de `QueryClientProvider` puro por este wrapper é
            só isso — resto do app usa `useQuery`/`useMutation` igual. */}
        <PersistQueryClientProvider client={queryClient} persistOptions={OFFLINE_PERSIST_OPTIONS}>
          <TemaProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </TemaProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
