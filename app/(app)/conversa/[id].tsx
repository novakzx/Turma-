import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import {
  aceitarPedido,
  apagarMensagemDireta,
  assinarMensagensDiretas,
  buscarConversa,
  enviarMensagemDireta,
  listarMensagens,
  listarParticipantes,
  recusarOuSair,
  type MensagemComAutor,
} from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { supabase } from '@/lib/supabase';

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function LinhaMensagem({
  mensagem,
  souEu,
  podeApagar,
  onApagar,
}: {
  mensagem: MensagemComAutor;
  souEu: boolean;
  podeApagar: boolean;
  onApagar: () => void;
}) {
  if (mensagem.apagada) {
    return (
      <View className={`my-1 max-w-[80%] ${souEu ? 'self-end' : 'self-start'}`}>
        <Text className="text-xs italic text-slate-400 dark:text-slate-500">Mensagem apagada</Text>
      </View>
    );
  }

  return (
    <View
      className={`my-1 max-w-[80%] gap-1 ${souEu ? 'items-end self-end' : 'items-start self-start'}`}
    >
      <View
        className={`rounded-3xl px-4 py-2.5 ${
          souEu
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-100 bg-surface dark:border-slate-800 dark:bg-surface-dark'
        }`}
      >
        <Text className={souEu ? 'text-white' : 'text-slate-900 dark:text-slate-100'}>
          {mensagem.conteudo}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 px-1">
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {formatarHora(mensagem.criado_em)}
        </Text>
        {!souEu ? <BotaoDenunciar tipoConteudo="mensagem_direta" conteudoId={mensagem.id} /> : null}
        {podeApagar ? (
          <Pressable
            onPress={onApagar}
            accessibilityRole="button"
            accessibilityLabel="Apagar mensagem"
            className="min-h-11 min-w-11 items-center justify-center px-1"
          >
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function DetalheConversa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const conversaQuery = useQuery({
    queryKey: ['conversa', id],
    queryFn: () => buscarConversa(id),
    enabled: !!id,
  });

  const participantesQuery = useQuery({
    queryKey: ['participantes', id],
    queryFn: () => listarParticipantes(id),
    enabled: !!id,
  });

  const mensagensQuery = useQuery({
    queryKey: ['mensagens-diretas', id],
    queryFn: () => listarMensagens(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const canal = assinarMensagensDiretas(id, () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens-diretas', id] });
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [id, queryClient]);

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ['mensagens-diretas', id] });
    queryClient.invalidateQueries({ queryKey: ['minhas-conversas'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos-mensagem'] });
  }

  const enviarMutation = useMutation({
    mutationFn: () =>
      enviarMensagemDireta({ conversaId: id, autorId: profile!.id, conteudo: texto.trim() }),
    onSuccess: () => {
      setTexto('');
      invalidarTudo();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarMensagemDireta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mensagens-diretas', id] }),
  });

  const aceitarMutation = useMutation({
    mutationFn: () => aceitarPedido(id, profile!.id),
    onSuccess: invalidarTudo,
  });

  const recusarMutation = useMutation({
    mutationFn: () => recusarOuSair(id, profile!.id),
    onSuccess: () => {
      invalidarTudo();
      router.back();
    },
  });

  if (conversaQuery.isLoading || participantesQuery.isLoading) return <LoadingState />;
  if (conversaQuery.isError || !conversaQuery.data) {
    return (
      <EmptyState
        titulo="Não deu pra abrir essa conversa"
        descricao="Ela pode ter sido apagada, ou você não faz mais parte dela."
      />
    );
  }

  const conversa = conversaQuery.data;
  const meuParticipante = participantesQuery.data?.find((p) => p.profile_id === profile?.id);
  const outroParticipante =
    conversa.tipo === 'direta'
      ? participantesQuery.data?.find((p) => p.profile_id !== profile?.id)
      : null;
  const ehPedidoPendente = meuParticipante?.pedido_aceito === false;
  const titulo =
    conversa.tipo === 'grupo'
      ? (conversa.nome ?? 'Grupo')
      : (outroParticipante?.profiles?.nome ?? 'Conversa');

  function handleEnviar() {
    if (!texto.trim()) {
      setErro('Escreve alguma coisa antes de enviar.');
      return;
    }
    setErro(null);
    enviarMutation.mutate();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: titulo,
          headerRight:
            conversa.tipo === 'grupo'
              ? () => (
                  <Pressable
                    onPress={() => router.push(`/grupo-participantes/${id}`)}
                    accessibilityRole="button"
                    accessibilityLabel="Participantes do grupo"
                  >
                    <Ionicons name="people-outline" size={22} color="#4F46E5" />
                  </Pressable>
                )
              : outroParticipante?.profiles
                ? () => (
                    <Pressable
                      onPress={() => router.push(`/perfil/${outroParticipante.profile_id}`)}
                      accessibilityRole="button"
                      accessibilityLabel="Ver perfil"
                    >
                      <FotoPerfil
                        caminho={outroParticipante.profiles?.foto_url ?? null}
                        nome={outroParticipante.profiles?.nome ?? '?'}
                        tamanho={32}
                      />
                    </Pressable>
                  )
                : undefined,
        }}
      />

      <FlatList
        data={mensagensQuery.data ?? []}
        keyExtractor={(item) => item.id}
        inverted={false}
        contentContainerClassName="gap-1 px-4 py-4"
        renderItem={({ item }) => (
          <LinhaMensagem
            mensagem={item}
            souEu={item.autor_id === profile?.id}
            podeApagar={item.autor_id === profile?.id && !item.apagada}
            onApagar={() => apagarMutation.mutate(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            titulo="Nenhuma mensagem ainda"
            descricao="Manda a primeira!"
          />
        }
      />

      {ehPedidoPendente ? (
        <View className="gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <Text className="text-sm text-slate-600 dark:text-slate-400">
            Essa pessoa ainda não te segue — é um pedido de mensagem.
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Recusar"
                variant="secondary"
                onPress={() => recusarMutation.mutate()}
                loading={recusarMutation.isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Aceitar"
                icon="checkmark"
                onPress={() => aceitarMutation.mutate()}
                loading={aceitarMutation.isPending}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                multiline
                placeholder="Escreva sua mensagem..."
              />
            </View>
            <Button
              label=""
              icon="send"
              onPress={handleEnviar}
              loading={enviarMutation.isPending}
              accessibilityLabel="Enviar mensagem"
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
