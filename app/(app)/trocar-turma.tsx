import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { EscolaTurmaForm } from '@/features/onboarding/EscolaTurmaForm';
import { buscarSerieAnoDaTurma } from '@/features/onboarding/api';

/** "Editar a turma" na tela de editar perfil (pedido do usuário, Fase
 * 10) — mesmo formulário do onboarding (escola + ano escolar +
 * verificação de estudante), só pré-preenchido com a escola/ano atuais
 * e navegando de volta ao concluir em vez de deixar o RootLayout reagir
 * sozinho. */
export default function TrocarTurma() {
  const { profile } = useAuth();

  // O perfil só guarda `turma_id` — busca o `serie_ano` dela pra
  // pré-selecionar o chip certo (senão a pessoa reabriria isto sem
  // nenhum ano marcado, mesmo já tendo um).
  const serieAnoQuery = useQuery({
    queryKey: ['serie-ano-turma-atual', profile?.turma_id],
    queryFn: () => buscarSerieAnoDaTurma(profile!.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  return (
    <ScrollView
      contentContainerClassName="gap-4 bg-background px-6 pb-10 pt-6 dark:bg-background-dark"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
        Trocar de turma
      </Text>
      {/* Espera o ano atual resolver antes de montar o formulário — o
          `serieAnoInicial` só vira estado inicial uma vez (`useState`);
          se o form montasse antes da query voltar, o chip do ano atual
          nunca apareceria pré-selecionado. */}
      {serieAnoQuery.isPending && profile?.turma_id ? (
        <ActivityIndicator color="#0095F6" />
      ) : (
        <EscolaTurmaForm
          escolaIdInicial={profile?.escola_id ?? null}
          serieAnoInicial={serieAnoQuery.data ?? null}
          labelBotaoConfirmar="Salvar"
          onConcluido={() => router.back()}
        />
      )}
    </ScrollView>
  );
}
