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
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisosWeb } from '@/components/ui/AvisosWeb';
import { BannerOffline } from '@/components/ui/BannerOffline';
import { PromptInstalarPWA } from '@/components/ui/PromptInstalarPWA';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { carregarTemaPreferido } from '@/features/configuracoes/tema';
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
 * Nota (ver README > "Limitações conhecidas"): no preview web deste SDK,
 * `useColorScheme()` já lê "dark" do sistema corretamente (dá pra ver no
 * header nativo abaixo, que é estilizado por esse valor), mas a classe
 * "dark" que as classes `dark:` do NativeWind dependem não chega a ser
 * aplicada no <html> — é uma limitação do target web desta versão da
 * lib, não do app. Tentativa de corrigir à mão (aplicar a classe no
 * `document.documentElement` manualmente) testada e **não funcionou**:
 * mesmo com a classe presente de verdade no `<html>` (confirmado via
 * DevTools), nada mudou visualmente — o NativeWind pro alvo web resolve
 * qual variante de estilo usar internamente (via um store próprio de
 * color scheme), não por cascata de CSS batendo com `.dark` no DOM, então
 * forçar a classe no DOM não tem efeito nenhum nesse mecanismo. Precisaria
 * de correção na própria lib (fora do escopo de um ajuste de UI pontual).
 * No target real (iOS/Android via Expo Go/EAS) o mesmo hook aciona a
 * classe corretamente, que é o caminho documentado.
 */
function RootNavigator() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session, profile, isLoadingSession, isLoadingProfile } = useAuth();

  useEffect(() => {
    // Aplica a preferência salva em Configurações → Tema assim que o app
    // abre. Sem isso, `setColorScheme` de uma sessão anterior não
    // sobreviveria a um restart — o NativeWind não persiste isso sozinho.
    carregarTemaPreferido().then((tema) => setColorScheme(tema));
  }, [setColorScheme]);

  if (isLoadingSession || (!!session && isLoadingProfile)) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator color={isDark ? '#A78BFA' : '#8B5CF6'} />
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
      {/* Redesign "dark-first" (pedido do usuário): fundo é sempre escuro
          agora (não um tema opcional — ver tailwind.config.js), então a
          barra de status sempre precisa de ícone claro. Deixar isso
          reagir a `isDark` de novo faria o ícone ficar escuro-sobre-escuro
          (invisível) sempre que `colorScheme` resolvesse "light" — que é
          o padrão do sistema pra quem nunca trocou o tema. */}
      <StatusBar style="light" />
      <BannerOffline />
      <PromptInstalarPWA />
      <View className="flex-1">
        <Stack
          screenOptions={{
            // `headerShadowVisible: false` — o header do React Navigation
            // traz uma borda/sombra inferior clara própria por padrão;
            // sem desligar isso ela aparece como linha branca sobre o
            // fundo escuro. Este header em si nunca chega a renderizar de
            // verdade (todo filho aqui usa `headerShown: false` e tem o
            // próprio Stack/Tabs) — mantido consistente mesmo assim.
            headerShadowVisible: false,
            headerStyle: { backgroundColor: isDark ? '#05060A' : '#0B0E14' },
            headerTintColor: '#F8FAFC',
            contentStyle: { backgroundColor: isDark ? '#05060A' : '#0B0E14' },
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
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
