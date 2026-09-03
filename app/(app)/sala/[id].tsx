import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarMensagem,
  assinarMensagens,
  buscarSala,
  definirSalaTrancada,
  enviarMensagem,
  listarMensagens,
  type MensagemComAutor,
} from '@/features/chat/api';
import { BotaoSilenciar } from '@/features/chat/BotaoSilenciar';
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import { supabase } from '@/lib/supabase';

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function LinhaMensagem({
  mensagem,
  ehStaff,
  ehPropria,
  onApagar,
}: {
  mensagem: MensagemComAutor;
  ehStaff: boolean;
  ehPropria: boolean;
  onApagar: () => void;
}) {
  if (mensagem.apagada) {
    // Só chega aqui pra staff (RLS esconde a mensagem apagada de quem
    // não é staff antes mesmo de sair do banco) — mantém a linha visível
    // pra fim de auditoria de moderação, sem mostrar o conteúdo.
    return (
      <View className="gap-0.5 py-1.5">
        <Text className="text-xs italic text-slate-400 dark:text-slate-500">
          {mensagem.profiles?.nome ?? 'Aluno'} · mensagem apagada pela moderação
        </Text>
      </View>
    );
  }

  return (
    <View className={`max-w-[85%] gap-1 py-1.5 ${ehPropria ? 'items-end self-end' : 'self-start'}`}>
      <View
        className={`gap-1 rounded-lg px-3 py-2 ${
          ehPropria
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-200 bg-surface dark:border-slate-700 dark:bg-surface-dark'
        }`}
      >
        {!ehPropria ? (
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {mensagem.profiles?.nome ?? 'Aluno'}
          </Text>
        ) : null}
        <Text
          className={`text-base ${ehPropria ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {mensagem.conteudo}
        </Text>
      </View>
      <View className="flex-row items-center gap-3 px-1">
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {formatarHora(mensagem.criado_em)}
        </Text>
        <BotaoDenunciar tipoConteudo="mensagem" conteudoId={mensagem.id} />
        {ehStaff && !ehPropria ? (
          <>
            <Pressable
              onPress={onApagar}
              accessibilityRole="button"
              accessibilityLabel="Apagar mensagem"
              className="min-h-11 min-w-11 items-center justify-center px-1"
            >
              <Text className="text-xs text-danger dark:text-danger-dark">Apagar</Text>
            </Pressable>
            {mensagem.autor_id ? <BotaoSilenciar perfilId={mensagem.autor_id} /> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function SalaChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<MensagemComAutor>>(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const salaQuery = useQuery({
    queryKey: ['sala', id],
    queryFn: () => buscarSala(id as string),
    enabled: !!id,
  });

  const mensagensQuery = useQuery({
    queryKey: ['mensagens', id],
    queryFn: () => listarMensagens(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const canal = assinarMensagens(id, () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens', id] });
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [id, queryClient]);

  useEffect(() => {
    if ((mensagensQuery.data?.length ?? 0) > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [mensagensQuery.data?.length]);

  const enviarMutation = useMutation({
    mutationFn: () =>
      enviarMensagem({ salaId: id as string, autorId: profile!.id, conteudo: texto.trim() }),
    onSuccess: () => {
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['mensagens', id] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarMensagem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mensagens', id] }),
  });

  const trancarMutation = useMutation({
    mutationFn: (trancada: boolean) => definirSalaTrancada(id as string, trancada),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sala', id] }),
  });

  if (salaQuery.isLoading || mensagensQuery.isLoading) return <LoadingState />;
  if (salaQuery.isError || !salaQuery.data) {
    return (
      <EmptyState titulo="Não deu pra carregar a sala" onTentarNovo={() => salaQuery.refetch()} />
    );
  }

  const sala = salaQuery.data;
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';
  const silenciadoAte = profile?.silenciado_ate ? new Date(profile.silenciado_ate) : null;
  const estaSilenciado = !!silenciadoAte && silenciadoAte > new Date();
  const podeEnviar = !sala.trancada && !estaSilenciado;

  function handleEnviar() {
    if (!texto.trim()) return;
    setErro(null);
    enviarMutation.mutate();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {ehStaff ? (
        <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <Text className="text-sm text-slate-600 dark:text-slate-400">
            {sala.trancada ? 'Sala trancada' : 'Sala aberta'}
          </Text>
          <Button
            label={sala.trancada ? 'Destrancar sala' : 'Trancar sala'}
            variant="secondary"
            onPress={() => trancarMutation.mutate(!sala.trancada)}
            loading={trancarMutation.isPending}
          />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        className="flex-1"
        contentContainerClassName="gap-1 p-4"
        data={mensagensQuery.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LinhaMensagem
            mensagem={item}
            ehStaff={ehStaff}
            ehPropria={item.autor_id === profile?.id}
            onApagar={() => apagarMutation.mutate(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma mensagem ainda. Manda a primeira!
          </Text>
        }
      />

      <View className="gap-1 border-t border-slate-200 p-3 dark:border-slate-800">
        {!podeEnviar ? (
          <Text className="px-1 text-xs text-slate-500 dark:text-slate-400">
            {sala.trancada
              ? 'Esta sala foi trancada pela moderação — só leitura.'
              : `Você está impedido de enviar mensagens até ${silenciadoAte ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(silenciadoAte) : ''}.`}
          </Text>
        ) : (
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                placeholder="Escreve uma mensagem..."
                error={erro ?? undefined}
              />
            </View>
            <Button label="Enviar" onPress={handleEnviar} loading={enviarMutation.isPending} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
