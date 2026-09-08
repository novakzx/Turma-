import { useColorScheme } from 'nativewind';
import { View, type ViewStyle } from 'react-native';

/** Anel sólido ao redor do avatar quando há story ativa — redesenho "app
 * profissional" (pedido do usuário): o anel gradiente multicolor
 * (Instagram/WhatsApp) virou uma borda sólida na cor primária, mesma
 * linguagem visual sóbria do resto do app. Mantém o "respiro" entre o
 * anel e a foto (um círculo da cor do fundo por baixo do avatar) — sem
 * essa camada o anel encostaria direto na foto. */
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
  const corAnel = isDark ? '#A78BFA' : '#8B5CF6';
  const fundoRespiro = isDark ? '#05060A' : '#0B0E14';
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
