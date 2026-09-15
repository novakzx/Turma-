import { useColorScheme } from 'nativewind';
import { View, type ViewStyle } from 'react-native';

/** Anel sólido ao redor do avatar quando há story ativa — cor sólida da
 * marca, mesma linguagem do resto do app (sem gradiente — pedido
 * explícito "tire os fades"). Mantém o "respiro" entre o anel e a foto
 * (um círculo da cor do fundo por baixo do avatar) — sem essa camada o
 * anel encostaria direto na foto; a cor do respiro precisa acompanhar o
 * fundo de verdade do app (redesign v5, claro) — fundo escuro aqui
 * deixaria um circulo preto atrás de cada avatar. */
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
  const corAnel = isDark ? '#0095F6' : '#0095F6';
  const fundoRespiro = isDark ? '#0A0A0A' : '#FAFAFA';
  const tamanhoRespiro = tamanho + espessura;
  const tamanhoAnel = tamanhoRespiro + espessura;

  const centralizado: ViewStyle = { alignItems: 'center', justifyContent: 'center' };

  return (
    <View
      style={[
        centralizado,
        {
          width: tamanhoAnel,
          height: tamanhoAnel,
          borderRadius: tamanhoAnel / 2,
          borderWidth: espessura,
          borderColor: corAnel,
        },
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
    </View>
  );
}
