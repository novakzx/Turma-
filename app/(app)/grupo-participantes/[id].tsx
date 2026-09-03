import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  adicionarParticipanteGrupo,
  listarParticipantes,
  recusarOuSair,
} from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { listarSeguidores, listarSeguindo } from '@/features/social/api';

function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Confirmar', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: aoConfirmar },
  ]);
}

/** Participantes do grupo — "só o dono ou os admins do grupo pode
 * adicionar novas pessoas" (resposta explícita do usuário, Fase
 * 9-10): quem não é admin só vê a lista e pode sair. */
export default function GrupoParticipantes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const participantesQuery = useQuery({
    queryKey: ['participantes', id],
    queryFn: () => listarParticipantes(id),
    enabled: !!id,
  });

  const seguindoQuery = useQuery({
    queryKey: ['seguindo', profile?.id],
    queryFn: () => listarSeguindo(profile!.id),
    enabled: !!profile && adicionando,
  });
  const seguidoresQuery = useQuery({
    queryKey: ['seguidores', profile?.id],
    queryFn: () => listarSeguidores(profile!.id),
    enabled: !!profile && adicionando,
  });

  const jaEstaoNoGrupo = useMemo(
    () => new Set((participantesQuery.data ?? []).map((p) => p.profile_id)),
    [participantesQuery.data],
  );

  const candidatos = useMemo(() => {
    const mapa = new Map<string, { id: string; nome: string; foto_url: string | null }>();
    for (const p of [...(seguindoQuery.data ?? []), ...(seguidoresQuery.data ?? [])]) {
      if (!jaEstaoNoGrupo.has(p.id)) mapa.set(p.id, p);
    }
    return Array.from(mapa.values());
  }, [seguindoQuery.data, seguidoresQuery.data, jaEstaoNoGrupo]);

  const adicionarMutation = useMutation({
    mutationFn: (novoId: string) => adicionarParticipanteGrupo(id, novoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['participantes', id] }),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const sairMutation = useMutation({
    mutationFn: () => recusarOuSair(id, profile!.id),
    onSuccess: () => router.back(),
  });

  if (participantesQuery.isLoading) return <LoadingState />;
  if (participantesQuery.isError) {
    return <EmptyState titulo="Não deu pra carregar os participantes" />;
  }

  const meuParticipante = participantesQuery.data?.find((p) => p.profile_id === profile?.id);
  const souAdmin = meuParticipante?.papel === 'admin';

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 px-6 pb-10 pt-6"
    >
      <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {participantesQuery.data?.length} participante
        {participantesQuery.data?.length === 1 ? '' : 's'}
      </Text>

      <View className="gap-2">
        {(participantesQuery.data ?? []).map((p) => (
          <View
            key={p.profile_id}
            className="flex-row items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
          >
            <FotoPerfil
              caminho={p.profiles?.foto_url ?? null}
              nome={p.profiles?.nome ?? '?'}
              tamanho={40}
            />
            <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">
              {p.profiles?.nome ?? 'Alguém'}
            </Text>
            {p.papel === 'admin' ? (
              <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-1 dark:bg-primary-dark/10">
                <Ionicons name="shield-checkmark-outline" size={12} color="#4F46E5" />
                <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
                  Admin
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {souAdmin ? (
        adicionando ? (
          <View className="gap-2">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Adicionar quem eu sigo ou me segue
            </Text>
            {candidatos.length === 0 ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Ninguém disponível pra adicionar agora.
              </Text>
            ) : (
              candidatos.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => adicionarMutation.mutate(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ${c.nome}`}
                  className="min-h-11 flex-row items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <FotoPerfil caminho={c.foto_url} nome={c.nome} tamanho={36} />
                  <Text className="flex-1 text-slate-900 dark:text-slate-100">{c.nome}</Text>
                  <Ionicons name="add-circle-outline" size={22} color="#4F46E5" />
                </Pressable>
              ))
            )}
            {erro ? (
              <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
            ) : null}
            <Button label="Concluído" variant="secondary" onPress={() => setAdicionando(false)} />
          </View>
        ) : (
          <Button
            label="Adicionar pessoas"
            icon="person-add-outline"
            variant="secondary"
            onPress={() => setAdicionando(true)}
          />
        )
      ) : null}

      <Button
        label="Sair do grupo"
        icon="exit-outline"
        variant="secondary"
        onPress={() => confirmar('Sair desse grupo?', () => sairMutation.mutate())}
        loading={sairMutation.isPending}
      />
    </ScrollView>
  );
}
