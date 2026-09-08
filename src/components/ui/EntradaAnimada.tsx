import { type ViewProps } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

type EntradaAnimadaProps = ViewProps & {
  /** Posição do item na lista — atrasa cada linha um pouco em cascata. */
  index?: number;
};

/**
 * Anima a entrada de um item de lista (feed, avisos, salas de chat) —
 * redesenho "app profissional" (pedido do usuário): trocado o
 * deslizar-de-baixo-com-mola da Fase 6 (efeito "vivo"/lúdico) por um
 * fade rápido e reto, sem bounce nem deslocamento — o tipo de transição
 * discreta que dashboard corporativo usa, não rede social. Desligado
 * quando o sistema pede "reduzir movimento" (brief seção 8), caindo pra
 * uma View sem animação nenhuma.
 */
export function EntradaAnimada({ index = 0, children, ...props }: EntradaAnimadaProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(Math.min(index * 25, 150)).duration(150)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
