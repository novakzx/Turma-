import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { TextoComMencoes } from '@/components/ui/TextoComMencoes';
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
        className={`gap-1 rounded-2xl px-4 py-2.5 shadow-sm shadow-slate-900/5 ${
          ehPropria
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-100 bg-surface dark:border-slate-800 dark:bg-surface-dark'
        }`}
      >
        {!ehPropria ? (
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {mensagem.profiles?.nome ?? 'Aluno'}
          </Text>
        ) : null}
        <TextoComMencoes
          texto={mensagem.conteudo}
          className={`text-base ${ehPropria ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
          // Bolha própria já é `bg-primary` — destacar a menção na MESMA
          // cor primária ficaria ilegível (texto primary sobre fundo
          // primary); sublinhado + branco continua indicando "isto é
          // clicável" sem sumir no fundo.
          mencaoClassName={ehPropria ? 'font-semibold text-white underline' : undefined}
        />
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
              className="min-h-11 min-w-11 flex-row items-center gap-1 px-1"
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
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
  // Sem barra de abas flutuante aqui (é uma tela empilhada, não uma aba),
  // então a caixa de mensagem cola direto no fundo real da tela — sem
  // somar `insets.bottom`, num iPhone de verdade ela fica colada/quase
  // encoberta pela barra de gestos (home indicator), igual o bug já
  // corrigido na barra de abas (ver src/lib/barraAbas.ts) — mesma causa,
  // tela diferente.
  const insets = useSafeAreaInsets();
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
        <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name={sala.trancada ? 'lock-closed' : 'lock-open-outline'}
              size={16}
              color="#64748B"
            />
            <Text className="text-sm text-slate-600 dark:text-slate-400">
              {sala.trancada ? 'Sala trancada' : 'Sala aberta'}
            </Text>
          </View>
          <Button
            label={sala.trancada ? 'Destrancar sala' : 'Trancar sala'}
            icon={sala.trancada ? 'lock-open-outline' : 'lock-closed'}
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
          <EmptyState
            icon="chatbubble-ellipses-outline"
            titulo="Nenhuma mensagem ainda"
            descricao="Manda a primeira pra puxar a conversa."
          />
        }
      />

      <View
        className="gap-1 border-t border-slate-100 p-3 dark:border-slate-800"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {!podeEnviar ? (
          <View className="flex-row items-center gap-1.5 px-1">
            <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
            <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400">
              {sala.trancada
                ? 'Esta sala foi trancada pela moderação — só leitura.'
                : `Você está impedido de enviar mensagens até ${silenciadoAte ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(silenciadoAte) : ''}.`}
            </Text>
          </View>
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
            <Button
              label="Enviar"
              icon="send"
              onPress={handleEnviar}
              loading={enviarMutation.isPending}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
