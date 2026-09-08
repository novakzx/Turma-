import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  atualizarStatusDenuncia,
  buscarConteudoDenunciado,
  listarDenuncias,
} from '@/features/moderacao/api';
import { ROTULO_STATUS_DENUNCIA, ROTULO_TIPO_CONTEUDO } from '@/features/moderacao/types';
import type { Denuncia, StatusDenuncia } from '@/features/moderacao/types';

function formatarData(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function CartaoDenuncia({
  denuncia,
  onMarcar,
}: {
  denuncia: Denuncia;
  onMarcar: (status: StatusDenuncia) => void;
}) {
  const conteudoQuery = useQuery({
    queryKey: ['conteudo-denunciado', denuncia.tipo_conteudo, denuncia.conteudo_id],
    queryFn: () => buscarConteudoDenunciado(denuncia.tipo_conteudo, denuncia.conteudo_id),
  });

  return (
    <View className="gap-3 rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center gap-1.5 rounded-md bg-accent/10 px-3 py-1 dark:bg-accent-dark/10">
          <Ionicons name="flag" size={12} color="#2DD4BF" />
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
            {ROTULO_TIPO_CONTEUDO[denuncia.tipo_conteudo]}
          </Text>
        </View>
        <Text className="text-xs text-slate-500">{formatarData(denuncia.criado_em)}</Text>
      </View>

      <View className="gap-1">
        <Text className="text-xs font-medium text-slate-400">Motivo da denúncia</Text>
        <Text className="text-sm text-slate-200">{denuncia.motivo}</Text>
      </View>

      <View className="gap-1 rounded-lg bg-slate-800/50 p-3">
        <Text className="text-xs font-medium text-slate-400">
          Conteúdo denunciado
          {conteudoQuery.data?.autorNome ? ` — ${conteudoQuery.data.autorNome}` : ''}
        </Text>
        {conteudoQuery.isLoading ? (
          <Text className="text-sm text-slate-500">Carregando...</Text>
        ) : (
          <Text className="text-sm text-slate-200">
            {conteudoQuery.data?.conteudo ?? 'Conteúdo não disponível (foi apagado).'}
          </Text>
        )}
      </View>

      <Text className="text-xs text-slate-400">
        Status: {ROTULO_STATUS_DENUNCIA[denuncia.status]}
      </Text>

      {denuncia.status !== 'resolvido' ? (
        <View className="flex-row gap-2">
          {denuncia.status === 'pendente' ? (
            <View className="flex-1">
              <Button
                label="Marcar revisado"
                variant="secondary"
                onPress={() => onMarcar('revisado')}
              />
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              label="Marcar resolvido"
              icon="checkmark"
              onPress={() => onMarcar('resolvido')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Fila de denúncias pra staff (brief seção 7: "fica numa fila que
 * professor/coordenação vê" — nunca tinha uma tela pra isso). Cobre os
 * quatro tipos de conteúdo denunciável (post, comentário, mensagem de
 * sala, mensagem direta) de forma genérica. */
export default function ModeracaoDenuncias() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<StatusDenuncia>('pendente');

  const denunciasQuery = useQuery({
    queryKey: ['denuncias', profile?.escola_id, filtro],
    queryFn: () => listarDenuncias(profile!.escola_id as string, filtro),
    enabled: !!profile?.escola_id,
  });

  const marcarMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusDenuncia }) =>
      atualizarStatusDenuncia(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['denuncias', profile?.escola_id] }),
  });

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 px-4 pb-10 pt-6"
    >
      <Text className="px-2 text-2xl font-bold text-primary dark:text-primary-dark">Denúncias</Text>

      <View className="flex-row gap-1 rounded-md bg-slate-800 p-1">
        {(['pendente', 'revisado', 'resolvido'] as StatusDenuncia[]).map((status) => (
          <Pressable
            key={status}
            onPress={() => setFiltro(status)}
            accessibilityRole="button"
            accessibilityState={{ selected: filtro === status }}
            className={`min-h-11 flex-1 items-center justify-center rounded-md px-2 py-2 ${
              filtro === status ? 'bg-primary dark:bg-primary-dark' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${filtro === status ? 'text-white' : 'text-slate-400'}`}
            >
              {ROTULO_STATUS_DENUNCIA[status]}
            </Text>
          </Pressable>
        ))}
      </View>

      {denunciasQuery.isLoading ? (
        <LoadingState />
      ) : denunciasQuery.isError ? (
        <EmptyState titulo="Não deu pra carregar" onTentarNovo={() => denunciasQuery.refetch()} />
      ) : (denunciasQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          titulo="Nada por aqui"
          descricao="Sem denúncias nesse status."
        />
      ) : (
        <View className="gap-3">
          {(denunciasQuery.data ?? []).map((d) => (
            <CartaoDenuncia
              key={d.id}
              denuncia={d}
              onMarcar={(status) => marcarMutation.mutate({ id: d.id, status })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
