import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAlturaTotalBarraAbas } from '@/lib/barraAbas';

const ICONE_POR_ROTA: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'calendar',
  feed: 'newspaper',
  chat: 'chatbubbles',
  estudo: 'sparkles',
  notas: 'calculator',
  perfil: 'person-circle',
};

/**
 * Barra de abas — redesenho "app profissional" (pedido do usuário):
 * substitui a pílula flutuante com sombra da Fase 6 (estilo Duolingo/
 * Instagram) por uma barra reta, docada na borda inferior de verdade,
 * com uma linha de borda fina em vez de elevação/sombra — visual de
 * dashboard corporativo. Cor de ícone/label segue o mesmo
 * `useColorScheme()` do NativeWind usado no resto do app (`app/
 * _layout.tsx`), já que `tabBarStyle` é um style object puro do
 * react-navigation, fora do alcance do `className`.
 */
export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const alturaTotal = useAlturaTotalBarraAbas();

  return (
    <Tabs
      screenOptions={{
        // `headerShadowVisible: false` — sem isso, o header do React
        // Navigation aplica uma borda/sombra inferior cinza-clara própria
        // por padrão (pensada pra tema claro), que aparecia como uma
        // linha branca por cima do fundo escuro (achado testando de
        // verdade no preview mobile, relatado pelo usuário).
        headerShadowVisible: false,
        headerStyle: { backgroundColor: escuro ? '#05060A' : '#0B0E14' },
        headerTintColor: '#F8FAFC',
        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: alturaTotal,
          borderTopWidth: 1,
          borderTopColor: escuro ? '#11141C' : '#171B26',
          backgroundColor: escuro ? '#05060A' : '#0B0E14',
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feriados',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.index} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.feed} size={size} color={color} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/buscar-usuarios')}
              accessibilityRole="button"
              accessibilityLabel="Pesquisar usuários"
              className="min-h-11 min-w-11 items-center justify-center px-2"
            >
              <Ionicons name="search-outline" size={22} color={escuro ? '#A78BFA' : '#8B5CF6'} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.chat} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="estudo"
        options={{
          title: 'Estudo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.estudo} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notas"
        options={{
          title: 'Notas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.notas} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONE_POR_ROTA.perfil} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
