import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * NativeWind só intercepta `className` nos primitivos que ele mesmo
 * conhece (View, Text, Pressable... importados de 'react-native'). Os
 * componentes do Reanimated (`Animated.View`, e o `Animated.Pressable`
 * criado via `createAnimatedComponent`) são referências diferentes, então
 * sem isso `className` neles é ignorado silenciosamente — nada quebra,
 * só o estilo não aparece. Precisa rodar uma vez, antes de qualquer
 * `Animated.View`/`AnimatedPressable` ser renderizado (por isso é
 * importado no `app/_layout.tsx` raiz).
 */
cssInterop(Animated.View, { className: 'style' });
