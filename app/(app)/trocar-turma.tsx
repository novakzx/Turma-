import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { EscolaTurmaForm } from '@/features/onboarding/EscolaTurmaForm';

/** "Editar a turma" na tela de editar perfil (pedido do usuário, Fase
 * 10) — mesmo formulário do onboarding (escola + turma + verificação
 * de estudante), só pré-preenchido com a escola atual e navegando de
 * volta ao concluir em vez de deixar o RootLayout reagir sozinho. */
export default function TrocarTurma() {
  const { profile } = useAuth();

  return (
    <ScrollView
      contentContainerClassName="gap-4 bg-background px-6 pb-10 pt-6 dark:bg-background-dark"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
        Trocar de turma
      </Text>
      <EscolaTurmaForm
        escolaIdInicial={profile?.escola_id ?? null}
        labelBotaoConfirmar="Salvar"
        onConcluido={() => router.back()}
      />
    </ScrollView>
  );
}
