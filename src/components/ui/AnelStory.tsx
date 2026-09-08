import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { View, type ViewStyle } from 'react-native';

/** Anel gradiente ao redor do avatar — o sinal visual clássico de
 * "tem story nova" (Instagram/WhatsApp), em vez de uma borda sólida de
 * uma cor só. Técnica padrão pra isso em RN: um círculo com gradiente
 * do tamanho do avatar + a borda, um círculo sólido da cor do fundo
 * por cima (o "respiro" entre o anel e a foto) e o avatar por cima de
 * tudo — sem essa camada do meio o gradiente encostaria direto na
 * foto, sem o respiro que dá a aparência de anel de verdade. */
export function AnelStory({
  tamanho,
  espessura = 3,
  children,
}: {
  tamanho: number;
  espessura?: number;
  children: React.ReactNode;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Cores da marca (primary/accent/danger, ver tailwind.config.js) em
  // vez das cores exatas do Instagram — o anel fica com a mesma
  // linguagem visual do resto do app, só que em gradiente.
  const cores = isDark
    ? (['#818CF8', '#FBBF24', '#F87171'] as const)
    : (['#4F46E5', '#F59E0B', '#DC2626'] as const);
  const fundoRespiro = isDark ? '#0F172A' : '#FFFFFF';
  const tamanhoRespiro = tamanho + espessura;
  const tamanhoGradiente = tamanhoRespiro + espessura;

  const centralizado: ViewStyle = { alignItems: 'center', justifyContent: 'center' };

  return (
    <LinearGradient
      colors={cores}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        centralizado,
        { width: tamanhoGradiente, height: tamanhoGradiente, borderRadius: tamanhoGradiente / 2 },
      ]}
    >
      <View
        style={[
          centralizado,
          {
            width: tamanhoRespiro,
            height: tamanhoRespiro,
            borderRadius: tamanhoRespiro / 2,
            backgroundColor: fundoRespiro,
          },
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}
