import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Placeholder "esqueleto" — pedido do usuário ("oque mais posso
 * adicionar... mais flat tipo X, Instagram"): esses apps nunca mostram
 * uma rodinha de carregamento pra lista de conteúdo, mostram a FORMA do
 * que está vindo (retângulos cinza pulsando) — sensação de "já sei mais
 * ou menos o que vai aparecer" em vez de "espera aí". Reservado pra
 * listas de conteúdo real (feed, salas, conversas); telas de
 * ação/formulário continuam usando `LoadingState` (spinner simples) —
 * não faz sentido desenhar o "esqueleto" de um formulário que a pessoa
 * ainda nem viu preenchido.
 *
 * Pulso desligado quando o sistema pede "reduzir movimento" (brief
 * seção 8) — fica um bloco cinza parado em vez de piscar.
 */
export function Skeleton({ className, style, ...props }: ViewProps) {
  const reduceMotion = useReducedMotion();
  const opacidade = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacidade.value = withRepeat(withTiming(0.5, { duration: 700 }), -1, true);
  }, [reduceMotion, opacidade]);

  const estiloAnimado = useAnimatedStyle(() => ({ opacity: opacidade.value }));

  return (
    <Animated.View
      style={[reduceMotion ? { opacity: 0.7 } : estiloAnimado, style]}
      className={`rounded-lg bg-slate-200 dark:bg-slate-200 ${className ?? ''}`}
      {...props}
    />
  );
}

/** Esqueleto de um `CartaoPost` — mesmas proporções (avatar 36px, duas
 * linhas de cabeçalho, corpo de texto, divisor) pra não "saltar" de
 * tamanho quando o post de verdade substituir o placeholder. */
export function SkeletonPost() {
  return (
    <View className="gap-3 border-b border-slate-200 bg-surface px-4 py-4 dark:border-slate-200 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <View className="gap-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </View>
      </View>
      <View className="gap-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </View>
    </View>
  );
}

/** Esqueleto de uma linha genérica (sala de chat, conversa, item de
 * lista com avatar/ícone + texto) — reusado em várias telas em vez de
 * um componente por tela, já que a forma é a mesma. */
export function SkeletonLinha() {
  return (
    <View className="flex-row items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
      </View>
    </View>
  );
}
