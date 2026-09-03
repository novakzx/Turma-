import '@/lib/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';

/**
 * Layout raiz do app. Tudo que precisa existir em toda tela mora aqui:
 * provider de dados do servidor (TanStack Query), área segura, gestos,
 * e o tema claro/escuro do header nativo do Stack.
 *
 * As rotas em si (login, onboarding, tabs) chegam nas próximas fases —
 * por enquanto só a home de fundação em app/index.tsx.
 *
 * Nota (ver README > "Limitações conhecidas"): no preview web deste SDK,
 * `useColorScheme()` já lê "dark" do sistema corretamente (dá pra ver no
 * header nativo abaixo, que é estilizado por esse valor), mas a classe
 * "dark" que as classes `dark:` do NativeWind dependem não chega a ser
 * aplicada no <html> — é uma limitação do target web desta versão da
 * lib, não do app. No target real (iOS/Android via Expo Go/EAS) o mesmo
 * hook aciona a classe corretamente, que é o caminho documentado.
 */
export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
              headerTintColor: isDark ? '#F1F5F9' : '#0F172A',
              contentStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            }}
          />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
