import '@/lib/global.css';
import '@/lib/nativewindAnimated';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisosWeb } from '@/components/ui/AvisosWeb';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { carregarTemaPreferido } from '@/features/configuracoes/tema';
import { queryClient } from '@/lib/queryClient';

/**
 * Decide qual grupo de rotas mostrar com base em sessão + perfil:
 * sem sessão → (auth); com sessão mas sem escola/turma → (onboarding);
 * com sessão e onboarding completo → (app). `Stack.Protected` troca de
 * grupo sozinho quando `session`/`profile` mudam (login, logout, term de
 * onboarding) — nenhuma navegação manual é necessária nas telas.
 *
 * Nota (ver README > "Limitações conhecidas"): no preview web deste SDK,
 * `useColorScheme()` já lê "dark" do sistema corretamente (dá pra ver no
 * header nativo abaixo, que é estilizado por esse valor), mas a classe
 * "dark" que as classes `dark:` do NativeWind dependem não chega a ser
 * aplicada no <html> — é uma limitação do target web desta versão da
 * lib, não do app. No target real (iOS/Android via Expo Go/EAS) o mesmo
 * hook aciona a classe corretamente, que é o caminho documentado.
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
        <ActivityIndicator color={isDark ? '#818CF8' : '#4F46E5'} />
      </View>
    );
  }

  const onboardingCompleto = !!profile?.escola_id && !!profile?.turma_id;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#F1F5F9' : '#0F172A',
          contentStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && !onboardingCompleto}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && onboardingCompleto}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <AvisosWeb />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
