import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  listarPedidosDasMinhasTurmas,
  responderPedidoEntradaTurma,
} from '@/features/onboarding/api';

type PedidoComDados = {
  id: string;
  criado_em: string;
  profiles: { nome: string } | null;
  turmas: { nome: string; serie_ano: string } | null;
};

/** "Pedidos de entrada" nas turmas que EU criei (brief Fase 9: só o
 * dono aprova quem entra). Só existe algo aqui se o usuário tiver
 * criado alguma turma — senão fica vazio, sem drama nenhum. */
export default function PedidosTurma() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const pedidosQuery = useQuery({
    queryKey: ['pedidos-minhas-turmas', profile?.id],
    queryFn: () => listarPedidosDasMinhasTurmas(profile!.id),
    enabled: !!profile,
  });

  const responderMutation = useMutation({
    mutationFn: (params: { id: string; aprovar: boolean }) =>
      responderPedidoEntradaTurma(params.id, params.aprovar),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pedidos-minhas-turmas', profile?.id] }),
  });

  if (pedidosQuery.isLoading) return <LoadingState />;
  if (pedidosQuery.isError) {
    return <EmptyState titulo="Não deu pra carregar" onTentarNovo={() => pedidosQuery.refetch()} />;
  }

  const pedidos = (pedidosQuery.data ?? []) as unknown as PedidoComDados[];

  if (pedidos.length === 0) {
    return (
      <EmptyState
        icon="mail-open-outline"
        titulo="Nenhum pedido pendente"
        descricao="Pedidos de entrada nas turmas que você criou aparecem aqui."
      />
    );
  }

  return (
    <View className="flex-1 gap-3 bg-background p-4 dark:bg-background-dark">
      {pedidos.map((pedido) => (
        <View
          key={pedido.id}
          className="gap-3 rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
              <Ionicons name="person-add-outline" size={18} color="#8B5CF6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-100">
                {pedido.profiles?.nome ?? 'Alguém'}
              </Text>
              <Text className="text-xs text-slate-400">
                quer entrar em {pedido.turmas?.serie_ano} · {pedido.turmas?.nome}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => responderMutation.mutate({ id: pedido.id, aprovar: false })}
              accessibilityRole="button"
              accessibilityLabel="Recusar"
              className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-slate-700"
            >
              <Ionicons name="close" size={16} color="#F87171" />
              <Text className="text-sm text-danger dark:text-danger-dark">Recusar</Text>
            </Pressable>
            <Pressable
              onPress={() => responderMutation.mutate({ id: pedido.id, aprovar: true })}
              accessibilityRole="button"
              accessibilityLabel="Aprovar"
              className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-primary dark:bg-primary-dark"
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text className="text-sm font-semibold text-white">Aprovar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
