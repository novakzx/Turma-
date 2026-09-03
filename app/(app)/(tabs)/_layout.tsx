import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Pressable } from 'react-native';

const ICONE_POR_ROTA: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'megaphone',
  feed: 'newspaper',
  chat: 'chatbubbles',
  estudo: 'sparkles',
  notas: 'calculator',
  perfil: 'person-circle',
};

/**
 * Barra de abas flutuante e arredondada (visual "empresa internacional"
 * pedido na Fase 6, no espírito de apps como Duolingo) — pílula com
 * sombra em vez da barra reta colada na borda inferior. Cor de
 * ícone/label segue o mesmo `useColorScheme()` do NativeWind usado no
 * resto do app (`app/_layout.tsx`), já que `tabBarStyle` é um style
 * object puro do react-navigation, fora do alcance do `className`.
 */
export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: escuro ? '#0F172A' : '#FFFFFF' },
        headerTintColor: escuro ? '#F1F5F9' : '#0F172A',
        tabBarActiveTintColor: escuro ? '#818CF8' : '#4F46E5',
        tabBarInactiveTintColor: escuro ? '#64748B' : '#94A3B8',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 32,
          borderTopWidth: 0,
          backgroundColor: escuro ? '#1E293B' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: escuro ? 0.4 : 0.12,
          shadowRadius: 16,
          elevation: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Avisos',
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
              <Ionicons name="search-outline" size={22} color={escuro ? '#818CF8' : '#4F46E5'} />
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
