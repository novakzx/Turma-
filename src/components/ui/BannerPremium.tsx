import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAssinante } from '@/features/assinatura/useAssinante';
import { useTema } from '@/features/configuracoes/TemaProvider';

/**
 * Banner de upsell do Premium (pedido do usuário: "adicione os banners
 * pra premium e melhore o tema, coloque efeitos") — gradiente na cor de
 * destaque escolhida (`useTema().cores.primary`, já reflete o tema
 * exclusivo Premium do próprio assinante, ver `TemaProvider.tsx`), com
 * brilho leve atrás pra dar profundidade sem exagerar. Não renderiza
 * nada pra quem já assina — cada tela só precisa colocar
 * `<BannerPremium />` sem checar `assinatura_ativa` ela mesma.
 */
export function BannerPremium({
  titulo = 'Turma+ Premium',
  descricao = 'IA sem limites, ferramentas de estudo extras, foguinho e temas exclusivos.',
}: {
  titulo?: string;
  descricao?: string;
}) {
  const assinante = useAssinante();
  const { cores } = useTema();

  if (assinante) return null;

  return (
    <View className="mx-4 mt-3 overflow-hidden rounded-2xl">
      {/* Brilho suave atrás do cartão — mesma cor de destaque, bem
          transparente, só pra dar profundidade sem virar poluição
          visual (pedido do usuário: "coloque efeitos"). */}
      <View
        pointerEvents="none"
        className="absolute -inset-3 rounded-3xl opacity-30"
        style={{ backgroundColor: cores.primary }}
      />
      <LinearGradient
        colors={[cores.primary, `${cores.primary}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center gap-3 rounded-2xl p-4"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-bold text-white">{titulo}</Text>
          <Text className="text-xs text-white/85">{descricao}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/assinatura')}
          accessibilityRole="button"
          accessibilityLabel="Ver benefícios do Turma+ Premium"
          className="min-h-9 items-center justify-center rounded-full bg-white/20 px-3.5 py-2"
        >
          <Text className="text-xs font-semibold text-white">Ver mais</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
