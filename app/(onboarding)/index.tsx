import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

import { EscolaTurmaForm } from '@/features/onboarding/EscolaTurmaForm';

export default function OnboardingScreen() {
  return (
    <ScrollView
      contentContainerClassName="gap-4 bg-background px-6 pb-10 pt-16 dark:bg-background-dark"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <View className="mb-2 items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-sm dark:bg-primary-dark">
          <Ionicons name="location" size={30} color="#FFFFFF" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-center text-2xl font-bold text-primary dark:text-primary-dark">
            Escolha sua escola e turma
          </Text>
          <Text className="text-center text-base text-slate-400">
            Isso decide quais avisos e turmas você vê no app.
          </Text>
        </View>
      </View>

      {/* O `RootLayout` reage sozinho assim que `profile.escola_id`/`turma_id`
          chegarem — não precisa navegar manualmente daqui. */}
      <EscolaTurmaForm onConcluido={() => {}} />
    </ScrollView>
  );
}
