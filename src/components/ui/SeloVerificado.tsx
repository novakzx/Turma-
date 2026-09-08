import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

/**
 * Selo de "conta verificada" — benefício da assinatura Turma+ Premium
 * (R$1,99/mês, ver `src/features/assinatura`). Fonte da verdade é
 * `profiles.assinatura_ativa`, escrita só pelo webhook do Stripe (ver
 * migration `assinatura_stripe`) — o componente só desenha o ícone,
 * não decide quem é verificado.
 */
export function SeloVerificado({ tamanho = 14 }: { tamanho?: number }) {
  return (
    <View accessibilityLabel="Conta verificada" accessibilityRole="image">
      <Ionicons name="checkmark-circle" size={tamanho} color="#2DD4BF" />
    </View>
  );
}
