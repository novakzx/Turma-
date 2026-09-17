import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarFalta,
  listarFaltas,
  listarMateriasDaTurma,
  registrarFalta,
} from '@/features/notas/api';
import { situacaoFaltas, type SituacaoFaltas } from '@/features/notas/regras';
import type { Materia } from '@/features/notas/types';

function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Confirmar', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: aoConfirmar },
  ]);
}

function ChipMateria({
  nome,
  selecionada,
  onPress,
}: {
  nome: string;
  selecionada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionada }}
      className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-md border px-4 ${
        selecionada ? 'border-primary bg-primary/10 dark:border-primary-dark' : 'border-slate-200'
      }`}
    >
      <Ionicons name="book-outline" size={15} color={selecionada ? '#0095F6' : '#969696'} />
      <Text className="text-sm text-slate-900">{nome}</Text>
    </Pressable>
  );
}

const ESTILO_SITUACAO: Record<
  SituacaoFaltas,
  {
    corBg: string;
    corTexto: string;
    corIcone: string;
    icone: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  sem_limite: {
    corBg: 'bg-slate-100',
    corTexto: 'text-slate-500',
    corIcone: '#969696',
    icone: 'information-circle-outline',
    label: 'Sem limite definido pra essa matéria',
  },
  ok: {
    corBg: 'bg-success/10',
    corTexto: 'text-success dark:text-success-dark',
    corIcone: '#22C55E',
    icone: 'checkmark-circle-outline',
    label: 'Dentro do limite',
  },
  atencao: {
    corBg: 'bg-accent/10 dark:bg-accent-dark/10',
    corTexto: 'text-accent dark:text-accent-dark',
    corIcone: '#0095F6',
    icone: 'alert-circle-outline',
    label: 'Perto do limite',
  },
  excedido: {
    corBg: 'bg-danger/10 dark:bg-danger-dark/10',
    corTexto: 'text-danger dark:text-danger-dark',
    corIcone: '#F87171',
    icone: 'warning-outline',
    label: 'Limite de faltas atingido',
  },
};

function CartaoSituacao({ materia, totalFaltas }: { materia: Materia; totalFaltas: number }) {
  const situacao = situacaoFaltas(totalFaltas, materia.limite_faltas);
  const estilo = ESTILO_SITUACAO[situacao];

  return (
    <View className={`gap-1 rounded-lg p-4 ${estilo.corBg}`}>
      <View className="flex-row items-center gap-2">
        <Ionicons name={estilo.icone} size={18} color={estilo.corIcone} />
        <Text className={`text-sm font-semibold ${estilo.corTexto}`}>{estilo.label}</Text>
      </View>
      <Text className="text-2xl font-bold text-slate-900">
        {totalFaltas}
        {materia.limite_faltas ? (
          <Text className="text-base font-normal text-slate-500"> / {materia.limite_faltas}</Text>
        ) : null}
      </Text>
      <Text className="text-xs text-slate-500">
        {totalFaltas === 1 ? 'falta registrada' : 'faltas registradas'}
      </Text>
    </View>
  );
}

export default function Faltas() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const faltasQuery = useQuery({
    queryKey: ['faltas', materiaId],
    queryFn: () => listarFaltas(materiaId as string),
    enabled: !!materiaId,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['faltas', materiaId] });
  }

  const registrarMutation = useMutation({
    mutationFn: () => {
      const hoje = new Date().toISOString().slice(0, 10);
      return registrarFalta(profile!.id, materiaId as string, hoje);
    },
    onSuccess: () => {
      setErro(null);
      invalidar();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarFalta,
    onSuccess: invalidar,
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const materiaSelecionada = (materiasQuery.data ?? []).find((m) => m.id === materiaId) ?? null;
  const jaRegistrouHoje = (faltasQuery.data ?? []).some(
    (f) => f.data === new Date().toISOString().slice(0, 10),
  );

  if (materiasQuery.isLoading) return <LoadingState />;
  if ((materiasQuery.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon="book-outline"
        titulo="Sua turma ainda não tem matéria cadastrada"
        descricao="Fale com a coordenação — matéria é cadastrada por ela."
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <View className="flex-row flex-wrap gap-2">
        {(materiasQuery.data ?? []).map((materia) => (
          <ChipMateria
            key={materia.id}
            nome={materia.nome}
            selecionada={materiaId === materia.id}
            onPress={() => setMateriaId(materia.id)}
          />
        ))}
      </View>

      {!materiaId ? (
        <EmptyState
          icon="hand-left-outline"
          titulo="Escolha uma matéria"
          descricao="Toque num chip acima pra ver suas faltas."
        />
      ) : faltasQuery.isLoading ? (
        <LoadingState />
      ) : (
        <>
          {materiaSelecionada ? (
            <CartaoSituacao
              materia={materiaSelecionada}
              totalFaltas={faltasQuery.data?.length ?? 0}
            />
          ) : null}

          <Button
            label={jaRegistrouHoje ? 'Falta de hoje já registrada' : 'Registrar falta de hoje'}
            icon="add-circle-outline"
            onPress={() => registrarMutation.mutate()}
            loading={registrarMutation.isPending}
            disabled={jaRegistrouHoje}
          />
          {erro ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color="#F87171" />
              <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
            </View>
          ) : null}

          {(faltasQuery.data ?? []).length === 0 ? null : (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Histórico</Text>
              {(faltasQuery.data ?? []).map((falta) => (
                <View
                  key={falta.id}
                  className="flex-row items-center justify-between rounded-lg border border-slate-200 bg-surface px-4 py-3 dark:bg-surface-dark"
                >
                  <Text className="text-sm text-slate-900">
                    {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(
                      new Date(`${falta.data}T12:00:00`),
                    )}
                  </Text>
                  <Pressable
                    onPress={() =>
                      confirmar('Apagar esse registro de falta?', () =>
                        apagarMutation.mutate(falta.id),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Apagar registro de falta"
                    className="min-h-11 min-w-11 items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={16} color="#F87171" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
