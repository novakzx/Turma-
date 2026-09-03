import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { assinarSalas, criarSalaAssunto, listarSalas } from '@/features/chat/api';
import { ROTULO_TIPO_SALA, type Sala, type TipoSalaChat } from '@/features/chat/types';
import { supabase } from '@/lib/supabase';

function LinhaSala({ sala }: { sala: Sala }) {
  return (
    <Pressable
      onPress={() => router.push(`/sala/${sala.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Abrir sala ${sala.nome}`}
      className="min-h-11 flex-row items-center justify-between rounded-lg border border-slate-200 bg-surface px-4 py-3 dark:border-slate-700 dark:bg-surface-dark"
    >
      <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">{sala.nome}</Text>
      {sala.trancada ? (
        <Text className="text-xs text-slate-500 dark:text-slate-400">🔒 trancada</Text>
      ) : null}
    </Pressable>
  );
}

function Secao({ titulo, salas }: { titulo: string; salas: Sala[] }) {
  if (salas.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</Text>
      <View className="gap-2">
        {salas.map((sala) => (
          <LinhaSala key={sala.id} sala={sala} />
        ))}
      </View>
    </View>
  );
}

export default function Chat() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [criandoAssunto, setCriandoAssunto] = useState(false);
  const [nomeAssunto, setNomeAssunto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const salasQuery = useQuery({ queryKey: ['salas'], queryFn: listarSalas });

  useEffect(() => {
    if (!profile?.escola_id) return;
    const canal = assinarSalas(profile.escola_id, () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [profile?.escola_id, queryClient]);

  const porTipo = useMemo(() => {
    const grupos: Record<TipoSalaChat, Sala[]> = { turma: [], materia: [], assunto: [] };
    for (const sala of salasQuery.data ?? []) grupos[sala.tipo].push(sala);
    return grupos;
  }, [salasQuery.data]);

  const criarMutation = useMutation({
    mutationFn: () =>
      criarSalaAssunto({
        escolaId: profile!.escola_id as string,
        criadoPor: profile!.id,
        nome: nomeAssunto.trim(),
      }),
    onSuccess: () => {
      setNomeAssunto('');
      setCriandoAssunto(false);
      queryClient.invalidateQueries({ queryKey: ['salas'] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleCriarAssunto() {
    if (!nomeAssunto.trim()) {
      setErro('Dá um nome pro assunto.');
      return;
    }
    setErro(null);
    criarMutation.mutate();
  }

  if (salasQuery.isLoading) return <LoadingState />;
  if (salasQuery.isError) {
    return (
      <EmptyState
        titulo="Não deu pra carregar as salas"
        onTentarNovo={() => salasQuery.refetch()}
      />
    );
  }

  const semSalas =
    porTipo.turma.length === 0 && porTipo.materia.length === 0 && porTipo.assunto.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-5 p-4"
    >
      <Secao titulo={ROTULO_TIPO_SALA.turma} salas={porTipo.turma} />
      <Secao titulo={`${ROTULO_TIPO_SALA.materia}s`} salas={porTipo.materia} />
      <Secao titulo={ROTULO_TIPO_SALA.assunto} salas={porTipo.assunto} />

      {semSalas ? (
        <EmptyState
          titulo="Nenhuma sala por aqui ainda"
          descricao="A sala da tua turma aparece assim que a turma tiver matérias cadastradas."
        />
      ) : null}

      <View className="gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        {criandoAssunto ? (
          <View className="gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <TextField
              label="Nome do assunto (ex.: Dúvidas de matemática)"
              value={nomeAssunto}
              onChangeText={setNomeAssunto}
              error={erro ?? undefined}
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => {
                    setCriandoAssunto(false);
                    setErro(null);
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Criar sala"
                  onPress={handleCriarAssunto}
                  loading={criarMutation.isPending}
                />
              </View>
            </View>
          </View>
        ) : (
          <Button
            label="+ Nova sala de assunto"
            variant="secondary"
            onPress={() => setCriandoAssunto(true)}
          />
        )}
      </View>
    </ScrollView>
  );
}
