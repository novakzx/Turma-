import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Componente novo criado por `createAnimatedComponent` — precisa do
// próprio registro de `className` (ver src/lib/nativewindAnimated.ts).
cssInterop(AnimatedPressable, { className: 'style' });

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Nome de um ícone do Ionicons, mostrado antes do texto. */
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Botão padrão do app — redesign "Instagram/Twitter/Duolingo" (pedido do
 * usuário): pílula bem arredondada, cor sólida (sem gradiente — pedido
 * explícito "tire os fades, deixe mais profissional"; a versão anterior
 * deste redesign usava o gradiente de marca aqui, mas ficou "chamativo
 * demais" em vez de profissional). Micro-encolher no toque mantido igual.
 * Desligado quando o sistema pede "reduzir movimento" (brief seção 8). Só
 * fica desabilitado durante a requisição (`loading`) — nunca antes disso
 * por causa de validação.
 */
export function Button({
  label,
  loading = false,
  variant = 'primary',
  icon,
  disabled,
  onPressIn,
  onPressOut,
  ...pressableProps
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || loading;
  const reduceMotion = useReducedMotion();
  const escala = useSharedValue(1);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      // `escala.value = ...` é a API normal de SharedValue do Reanimated —
      // não é estado do React, então mutar `.value` é o jeito certo (e o
      // único) de animar. O linter (`react-hooks/immutability`, novo com o
      // React Compiler) não conhece esse padrão do Reanimated e marca falso
      // positivo aqui.
      // eslint-disable-next-line react-hooks/immutability
      if (!reduceMotion) escala.value = withTiming(0.96, { duration: 90 });
      onPressIn?.(e);
    },
    [escala, onPressIn, reduceMotion],
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      // eslint-disable-next-line react-hooks/immutability -- ver handlePressIn acima
      if (!reduceMotion) escala.value = withTiming(1, { duration: 120 });
      onPressOut?.(e);
    },
    [escala, onPressOut, reduceMotion],
  );

  const corTexto = isPrimary ? '#FFFFFF' : '#385898';

  return (
    <AnimatedPressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={estiloAnimado}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-full px-5 py-3 ${
        isPrimary
          ? 'bg-primary shadow-sm dark:bg-primary-dark'
          : isGhost
            ? 'bg-transparent'
            : 'border border-slate-200 bg-surface dark:bg-surface-dark'
      } ${isDisabled ? 'opacity-60' : ''}`}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Ionicons name={icon} size={18} color={corTexto} /> : null}
          <Text
            className={`text-base font-semibold ${
              isPrimary ? 'text-white' : 'text-primary dark:text-primary-dark'
            }`}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
