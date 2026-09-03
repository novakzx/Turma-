import { Text, View } from 'react-native';

/**
 * Home provisória da Fase 0 — só confirma que o scaffold (Expo Router +
 * NativeWind + providers) está de pé. Vira a tela de splash/redirecionamento
 * de autenticação na Fase 1.
 */
export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
      <Text className="text-center text-2xl font-bold text-primary dark:text-primary-dark">
        Turma+
      </Text>
      <Text className="mt-2 text-center text-base text-slate-600 dark:text-slate-300">
        Fundação do projeto no ar. Fase 1 traz conta e perfil.
      </Text>
    </View>
  );
}
