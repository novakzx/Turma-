import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { buscarUsuarios } from '@/features/busca/api';
import { criarConversaDireta, criarConversaGrupo } from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { listarSeguidores, listarSeguindo } from '@/features/social/api';
import type { PerfilResumo } from '@/features/social/types';

/** Escolher com quem conversar. Sem busca global de usuário ainda
 * (isso é a Fase 13) — por enquanto a lista vem de quem eu sigo +
 * quem me segue, que é exatamente quem já tem alguma relação comigo
 * no app. Evolui naturalmente quando a busca chegar. */
export default function NovaConversa() {
  const { profile } = useAuth();
  const [modoGrupo, setModoGrupo] = useState(false);
  const [busca, setBusca] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const seguindoQuery = useQuery({
    queryKey: ['seguindo', profile?.id],
    queryFn: () => listarSeguindo(profile!.id),
    enabled: !!profile,
  });
  const seguidoresQuery = useQuery({
    queryKey: ['seguidores', profile?.id],
    queryFn: () => listarSeguidores(profile!.id),
    enabled: !!profile,
  });

  // Busca global (Fase 13) — só dispara com 2+ letras, e complementa a
  // lista de quem eu sigo/me segue em vez de substituir (assim quem
  // digita nada ainda vê sugestões óbvias pra conversar).
  const buscaGlobalQuery = useQuery({
    queryKey: ['busca-usuarios', busca],
    queryFn: () => buscarUsuarios(busca, profile!.id),
    enabled: !!profile && busca.trim().length >= 2,
  });

  const pessoas = useMemo(() => {
    const mapa = new Map<string, PerfilResumo>();
    for (const p of [
      ...(seguindoQuery.data ?? []),
      ...(seguidoresQuery.data ?? []),
      ...(buscaGlobalQuery.data ?? []),
    ]) {
      mapa.set(p.id, p);
    }
    const termo = busca.trim().toLowerCase();
    return Array.from(mapa.values()).filter((p) => !termo || p.nome.toLowerCase().includes(termo));
  }, [seguindoQuery.data, seguidoresQuery.data, buscaGlobalQuery.data, busca]);

  const iniciarDiretaMutation = useMutation({
    mutationFn: (outroId: string) => criarConversaDireta(outroId),
    onSuccess: (conversaId) => router.replace(`/conversa/${conversaId}`),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const criarGrupoMutation = useMutation({
    mutationFn: () => criarConversaGrupo(nomeGrupo.trim(), Array.from(selecionados)),
    onSuccess: (conversaId) => router.replace(`/conversa/${conversaId}`),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function alternarSelecionado(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function handleCriarGrupo() {
    if (!nomeGrupo.trim()) {
      setErro('Dê um nome pro grupo.');
      return;
    }
    if (selecionados.size === 0) {
      setErro('Escolha ao menos uma pessoa.');
      return;
    }
    setErro(null);
    criarGrupoMutation.mutate();
  }

  const carregando = seguindoQuery.isLoading || seguidoresQuery.isLoading;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 px-6 pb-10 pt-6"
    >
      <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
        {modoGrupo ? 'Criar grupo' : 'Nova conversa'}
      </Text>

      <View className="flex-row gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
        <Pressable
          onPress={() => setModoGrupo(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: !modoGrupo }}
          className={`min-h-11 flex-1 items-center justify-center rounded-full px-4 py-2 ${!modoGrupo ? 'bg-primary dark:bg-primary-dark' : ''}`}
        >
          <Text
            className={`text-sm font-semibold ${!modoGrupo ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Direta
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setModoGrupo(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: modoGrupo }}
          className={`min-h-11 flex-1 items-center justify-center rounded-full px-4 py-2 ${modoGrupo ? 'bg-primary dark:bg-primary-dark' : ''}`}
        >
          <Text
            className={`text-sm font-semibold ${modoGrupo ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Grupo
          </Text>
        </Pressable>
      </View>

      {modoGrupo ? (
        <TextField
          label="Nome do grupo"
          icon="people-outline"
          value={nomeGrupo}
          onChangeText={setNomeGrupo}
          placeholder="ex.: Trabalho de História"
        />
      ) : null}

      <TextField
        label="Pesquisar"
        icon="search-outline"
        value={busca}
        onChangeText={setBusca}
        placeholder="Nome..."
      />

      {carregando ? (
        <LoadingState />
      ) : pessoas.length === 0 ? (
        <EmptyState
          icon="people-outline"
          titulo="Ninguém por aqui ainda"
          descricao="Siga alguém primeiro pra poder conversar (ou espere alguém te seguir)."
        />
      ) : (
        <View className="gap-2">
          {pessoas.map((pessoa) => {
            const selecionado = selecionados.has(pessoa.id);
            return (
              <Pressable
                key={pessoa.id}
                onPress={() =>
                  modoGrupo
                    ? alternarSelecionado(pessoa.id)
                    : iniciarDiretaMutation.mutate(pessoa.id)
                }
                accessibilityRole="button"
                accessibilityState={{ selected: selecionado }}
                className={`min-h-11 flex-row items-center gap-3 rounded-2xl border p-3 ${
                  selecionado
                    ? 'border-primary bg-primary/10 dark:border-primary-dark'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                <FotoPerfil caminho={pessoa.foto_url} nome={pessoa.nome} tamanho={40} />
                <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">
                  {pessoa.nome}
                </Text>
                {modoGrupo && selecionado ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}

      {modoGrupo ? (
        <Button
          label="Criar grupo"
          icon="checkmark"
          onPress={handleCriarGrupo}
          loading={criarGrupoMutation.isPending}
        />
      ) : null}
    </ScrollView>
  );
}
