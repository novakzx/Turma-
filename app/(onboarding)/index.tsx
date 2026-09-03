import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  concluirOnboarding,
  listarEscolas,
  listarTurmasPorEscola,
} from '@/features/onboarding/api';

function ItemSelecionavel({
  label,
  selecionado,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      className={`min-h-11 justify-center rounded-lg border px-3 py-2 ${
        selecionado
          ? 'border-primary bg-primary/10 dark:border-primary-dark'
          : 'border-slate-300 dark:border-slate-700'
      }`}
    >
      <Text className="text-base text-slate-900 dark:text-slate-100">{label}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [escolaId, setEscolaId] = useState<string | null>(null);
  const [turmaId, setTurmaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const escolasQuery = useQuery({ queryKey: ['escolas'], queryFn: listarEscolas });
  const turmasQuery = useQuery({
    queryKey: ['turmas', escolaId],
    queryFn: () => listarTurmasPorEscola(escolaId as string),
    enabled: !!escolaId,
  });

  const mutation = useMutation({
    mutationFn: concluirOnboarding,
    onSuccess: () => {
      // O RootLayout reage sozinho assim que `profile.escola_id`/`turma_id`
      // chegarem — não precisa navegar manualmente daqui.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleConfirmar() {
    if (!session) return;
    if (!escolaId) {
      setErro('Escolha uma escola.');
      return;
    }
    if (!turmaId) {
      setErro('Escolha uma turma.');
      return;
    }
    setErro(null);
    mutation.mutate({ userId: session.user.id, escolaId, turmaId });
  }

  return (
    <ScrollView
      contentContainerClassName="gap-4 bg-background px-6 pb-10 pt-16 dark:bg-background-dark"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <View className="gap-1">
        <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
          Escolha sua escola e turma
        </Text>
        <Text className="text-base text-slate-600 dark:text-slate-400">
          Isso decide quais avisos e turmas você vê no app.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Escola</Text>
        {escolasQuery.isLoading ? (
          <ActivityIndicator />
        ) : escolasQuery.isError ? (
          <Text className="text-danger dark:text-danger-dark">
            Não deu pra carregar as escolas. Tenta de novo mais tarde.
          </Text>
        ) : escolasQuery.data && escolasQuery.data.length === 0 ? (
          <Text className="text-slate-500 dark:text-slate-400">
            Nenhuma escola cadastrada ainda — fale com a coordenação.
          </Text>
        ) : (
          <View className="gap-2">
            {escolasQuery.data?.map((escola) => (
              <ItemSelecionavel
                key={escola.id}
                label={escola.nome}
                selecionado={escolaId === escola.id}
                onPress={() => {
                  setEscolaId(escola.id);
                  setTurmaId(null);
                  setErro(null);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {escolaId ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Turma</Text>
          {turmasQuery.isLoading ? (
            <ActivityIndicator />
          ) : turmasQuery.isError ? (
            <Text className="text-danger dark:text-danger-dark">
              Não deu pra carregar as turmas. Tenta de novo mais tarde.
            </Text>
          ) : turmasQuery.data && turmasQuery.data.length === 0 ? (
            <Text className="text-slate-500 dark:text-slate-400">
              Essa escola ainda não tem turma cadastrada.
            </Text>
          ) : (
            <View className="gap-2">
              {turmasQuery.data?.map((turma) => (
                <ItemSelecionavel
                  key={turma.id}
                  label={`${turma.serie_ano} · ${turma.nome}`}
                  selecionado={turmaId === turma.id}
                  onPress={() => {
                    setTurmaId(turma.id);
                    setErro(null);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}

      <Button label="Confirmar" onPress={handleConfirmar} loading={mutation.isPending} />
    </ScrollView>
  );
}
