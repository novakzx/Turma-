import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderDireita, HeaderEsquerda } from '@/components/ui/TopHeader';
import { useTema } from '@/features/configuracoes/TemaProvider';

// Redesign "Instagram" (pedido do usuário): ícone contorno quando inativo,
// preenchido quando ativo — mesma linguagem do Instagram/Threads em vez de
// só trocar a cor do ícone parado.
const ICONES_POR_ROTA: Record<
  string,
  { ativo: keyof typeof Ionicons.glyphMap; inativo: keyof typeof Ionicons.glyphMap }
> = {
  index: { ativo: 'calendar', inativo: 'calendar-outline' },
  feed: { ativo: 'newspaper', inativo: 'newspaper-outline' },
  chat: { ativo: 'chatbubbles', inativo: 'chatbubbles-outline' },
  estudo: { ativo: 'sparkles', inativo: 'sparkles-outline' },
  notas: { ativo: 'calculator', inativo: 'calculator-outline' },
  perfil: { ativo: 'person-circle', inativo: 'person-circle-outline' },
};

// Altura só do conteúdo da barra (ícone + legenda + respiro), sem contar
// o inset de segurança do rodapé — 64 é generoso o bastante pro ícone
// (~25px) + legenda (11px) + respiro caberem confortavelmente mesmo
// depois de `paddingTop` tirar uma fatia. Achado testando de verdade:
// uma versão anterior usava 56 aqui, apertado de mais — a legenda ficava
// cortada/invisível, exatamente o "entrando nas extremidades da tela"
// que o usuário relatou.
const ALTURA_CONTEUDO_BARRA = 64;

/**
 * Barra de abas — redesenho "app profissional" (pedido do usuário):
 * substitui a pílula flutuante com sombra da Fase 6 (estilo Duolingo/
 * Instagram) por uma barra reta, docada na borda inferior de verdade,
 * com uma linha de borda fina em vez de elevação/sombra — visual de
 * dashboard corporativo. Cor de ícone/label segue o mesmo `useTema()`
 * usado no resto do app (`app/_layout.tsx`/`TemaProvider.tsx`), já que
 * `tabBarStyle` é um style object puro do react-navigation, fora do
 * alcance do `className`.
 *
 * Altura e `paddingBottom` calculados à mão (em vez de deixar o
 * `@react-navigation/bottom-tabs` calcular sozinho, que seria o caminho
 * "de menos código") — achado testando de verdade: nesta versão exata das
 * dependências, o cálculo automático joga um `ReferenceError:
 * useSafeAreaInsets is not defined` no console no alvo web (bug da
 * própria lib, não do código deste projeto). Calcular aqui evita
 * depender desse caminho interno quebrado.
 */
export default function TabsLayout() {
  const { escuro, cores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // `headerShadowVisible: false` — sem isso, o header do React
        // Navigation aplica uma borda/sombra inferior cinza-clara própria
        // por padrão (pensada pra tema claro), que aparecia como uma
        // linha branca por cima do fundo escuro (achado testando de
        // verdade no preview mobile, relatado pelo usuário).
        headerShadowVisible: false,
        headerStyle: { backgroundColor: escuro ? '#0B0E14' : '#FAF8FF' },
        headerTintColor: escuro ? '#F1F5F9' : '#131B2E',
        // `headerLeft`/`headerRight` (não um `headerTitle` esticando a
        // barra inteira) — cada um do tamanho do próprio conteúdo, sem
        // forçar `width: 0`/`flex: 1` nos containers. Essa era a v1 deste
        // header e ficou "bugada" no Safari de verdade do iPhone (relatado
        // pelo usuário, não reproduzido no emulador de mobile do Chrome —
        // ver `TopHeader.tsx`); `headerTitle: () => null` tira o título
        // central padrão do meio, que senão sobraria vazio ali.
        headerTitle: () => null,
        tabBarActiveTintColor: cores.primary,
        tabBarInactiveTintColor: cores.mutado,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: ALTURA_CONTEUDO_BARRA + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: escuro ? '#262D39' : '#EDEBFA',
          backgroundColor: escuro ? '#171B26' : '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 6,
          // `Math.max(insets.bottom, 8)`, não só `insets.bottom` —
          // `useSafeAreaInsets()` no alvo web só enxerga o recorte de
          // segurança de verdade via `env(safe-area-inset-bottom)`, que o
          // navegador só expõe com `viewport-fit=cover` no `<meta
          // name="viewport">` (corrigido em `scripts/injetar-tags-pwa.js`)
          // — sem essa diretiva o valor lido é sempre 0. Este piso mínimo
          // garante uma folga mesmo se algum navegador/contexto ainda não
          // expuser o inset de verdade.
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feriados',
          headerLeft: () => <HeaderEsquerda subtitulo="Feriados" />,
          headerRight: () => <HeaderDireita />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.index.ativo : ICONES_POR_ROTA.index.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          headerLeft: () => <HeaderEsquerda subtitulo="Feed" />,
          headerRight: () => (
            <HeaderDireita
              acaoExtra={{
                icone: 'search-outline',
                label: 'Pesquisar usuários',
                aoPressionar: () => router.push('/buscar-usuarios'),
              }}
            />
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.feed.ativo : ICONES_POR_ROTA.feed.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerLeft: () => <HeaderEsquerda subtitulo="Chat" />,
          headerRight: () => <HeaderDireita />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.chat.ativo : ICONES_POR_ROTA.chat.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="estudo"
        options={{
          title: 'Estudo',
          headerLeft: () => <HeaderEsquerda subtitulo="Turma IA" />,
          headerRight: () => <HeaderDireita />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.estudo.ativo : ICONES_POR_ROTA.estudo.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notas"
        options={{
          title: 'Notas',
          headerLeft: () => <HeaderEsquerda subtitulo="Notas" />,
          headerRight: () => <HeaderDireita />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.notas.ativo : ICONES_POR_ROTA.notas.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          headerLeft: () => <HeaderEsquerda subtitulo="Perfil" />,
          headerRight: () => <HeaderDireita />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES_POR_ROTA.perfil.ativo : ICONES_POR_ROTA.perfil.inativo}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
