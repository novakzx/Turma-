import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import { useAuth } from '@/features/auth/AuthProvider';
import { listarAvisos } from '@/features/avisos/api';
import { ICONE_TIPO_AVISO, ROTULO_TIPO_AVISO, type Aviso } from '@/features/avisos/types';
import { supabase } from '@/lib/supabase';

function formatarData(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function CartaoAviso({ aviso, index }: { aviso: Aviso; index: number }) {
  const isAutomatico = aviso.origem === 'automatico';
  const corAcento = isAutomatico ? '#F59E0B' : '#4F46E5';
  return (
    <EntradaAnimada
      index={index}
      className="gap-2 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${corAcento}1A` }}
        >
          <Ionicons name={ICONE_TIPO_AVISO[aviso.tipo]} size={20} color={corAcento} />
        </View>
        <View className="flex-1">
          <Text
            className={`text-xs font-semibold uppercase tracking-wide ${
              isAutomatico
                ? 'text-accent dark:text-accent-dark'
                : 'text-primary dark:text-primary-dark'
            }`}
          >
            {ROTULO_TIPO_AVISO[aviso.tipo]}
            {aviso.turma_id ? ' · turma' : ' · escola toda'}
          </Text>
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {aviso.titulo}
          </Text>
        </View>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(aviso.criado_em)}
        </Text>
      </View>
      {aviso.descricao ? (
        <Text className="text-sm text-slate-600 dark:text-slate-400">{aviso.descricao}</Text>
      ) : null}
    </EntradaAnimada>
  );
}

export default function MuralDeAvisos() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';

  const avisosQuery = useQuery({ queryKey: ['avisos'], queryFn: listarAvisos });

  useEffect(() => {
    // Mural em tempo real (brief 6.1): em vez de reconstruir a lista à
    // mão a partir do payload do evento, só invalida a query — a RLS já
    // faz o filtro de escopo de qualquer forma, então um refetch é a
    // fonte de verdade mais simples e correta.
    const channel = supabase
      .channel('avisos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos' }, () =>
        queryClient.invalidateQueries({ queryKey: ['avisos'] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {avisosQuery.isLoading ? (
        <LoadingState />
      ) : avisosQuery.isError ? (
        <EmptyState
          titulo="Não deu pra carregar os avisos"
          descricao="Verifica sua conexão e tenta de novo."
          onTentarNovo={() => avisosQuery.refetch()}
        />
      ) : (avisosQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          titulo="Nenhum aviso por aqui ainda"
          descricao="Quando a coordenação ou um professor publicar algo, aparece nessa lista."
        />
      ) : (
        <FlatList
          data={avisosQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-4 pb-28"
          renderItem={({ item, index }) => <CartaoAviso aviso={item} index={index} />}
        />
      )}

      {ehStaff ? (
        <Pressable
          onPress={() => router.push('/novo-aviso')}
          accessibilityRole="button"
          accessibilityLabel="Publicar aviso"
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 dark:bg-primary-dark"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}
