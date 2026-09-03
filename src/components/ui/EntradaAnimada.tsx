import { type ViewProps } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

type EntradaAnimadaProps = ViewProps & {
  /** Posição do item na lista — atrasa cada linha um pouco em cascata. */
  index?: number;
};

/**
 * Anima a entrada de um item de lista (feed, avisos, salas de chat) com
 * um leve deslizar + fade em cascata — o "vivo" pedido na Fase 6.
 * Desligado quando o sistema pede "reduzir movimento" (brief seção 8:
 * "Respeite a configuração de 'reduzir movimento' do sistema nas
 * animações"), caindo pra uma View sem animação nenhuma.
 */
export function EntradaAnimada({ index = 0, children, ...props }: EntradaAnimadaProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.delay(Math.min(index * 40, 240))
              .springify()
              .damping(18)
      }
      {...props}
    >
      {children}
    </Animated.View>
  );
}
