import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BolhaAudio } from '@/components/ui/BolhaAudio';
import { Button } from '@/components/ui/Button';
import { CaixaMensagem } from '@/components/ui/CaixaMensagem';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { ImagemChat } from '@/components/ui/ImagemChat';
import { TextoComMencoes } from '@/components/ui/TextoComMencoes';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarMensagem,
  assinarMensagens,
  buscarSala,
  definirSalaTrancada,
  enviarMensagem,
  fazerUploadMidiaSala,
  listarMensagens,
  obterUrlAssinadaSala,
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
        <Text className="text-xs italic text-slate-500">
          {mensagem.profiles?.nome ?? 'Aluno'} · mensagem apagada pela moderação
        </Text>
      </View>
    );
  }

  return (
    <View className={`max-w-[85%] gap-1 py-1.5 ${ehPropria ? 'items-end self-end' : 'self-start'}`}>
      <View
        className={`gap-1 rounded-lg px-4 py-2.5 ${
          ehPropria
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-800 bg-surface dark:bg-surface-dark'
        }`}
      >
        {!ehPropria ? (
          <Text className="text-xs font-semibold text-slate-400">
            {mensagem.profiles?.nome ?? 'Aluno'}
          </Text>
        ) : null}
        {mensagem.midia_tipo === 'imagem' && mensagem.midia_url ? (
          <ImagemChat caminho={mensagem.midia_url} obterUrl={obterUrlAssinadaSala} />
        ) : mensagem.midia_tipo === 'audio' && mensagem.midia_url ? (
          <BolhaAudio
            caminho={mensagem.midia_url}
            obterUrl={obterUrlAssinadaSala}
            corIcone={ehPropria ? '#FFFFFF' : '#8B5CF6'}
            corTexto={ehPropria ? 'text-white' : 'text-slate-100'}
          />
        ) : null}
        {mensagem.conteudo ? (
          <TextoComMencoes
            texto={mensagem.conteudo}
            className={`text-base ${ehPropria ? 'text-white' : 'text-slate-100'}`}
            // Bolha própria já é `bg-primary` — destacar a menção na MESMA
            // cor primária ficaria ilegível (texto primary sobre fundo
            // primary); sublinhado + branco continua indicando "isto é
            // clicável" sem sumir no fundo.
            mencaoClassName={ehPropria ? 'font-semibold text-white underline' : undefined}
          />
        ) : null}
      </View>
      <View className="flex-row items-center gap-3 px-1">
        <Text className="text-xs text-slate-500">{formatarHora(mensagem.criado_em)}</Text>
        <BotaoDenunciar tipoConteudo="mensagem" conteudoId={mensagem.id} />
        {ehStaff && !ehPropria ? (
          <>
            <Pressable
              onPress={onApagar}
              accessibilityRole="button"
              accessibilityLabel="Apagar mensagem"
              className="min-h-11 min-w-11 flex-row items-center gap-1 px-1"
            >
              <Ionicons name="trash-outline" size={14} color="#F87171" />
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
  // Tela empilhada, sem barra de abas — a caixa de mensagem cola direto
  // no fundo real da tela, então precisa somar `insets.bottom` à mão
  // (senão fica colada/quase encoberta pela barra de gestos do sistema
  // num iPhone de verdade). A barra de abas em si não precisa mais desse
  // cálculo manual — `(tabs)/_layout.tsx` deixa a altura por conta do
  // `@react-navigation/bottom-tabs`, que já soma esse inset sozinho.
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MensagemComAutor>>(null);
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
    mutationFn: (params: {
      conteudo?: string;
      midiaUrl?: string;
      midiaTipo?: 'imagem' | 'audio';
    }) => enviarMensagem({ salaId: id as string, autorId: profile!.id, ...params }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mensagens', id] }),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const enviarImagemMutation = useMutation({
    mutationFn: async ({ uri, arquivoWeb }: { uri: string; arquivoWeb: File | null }) => {
      const caminho = await fazerUploadMidiaSala(id as string, uri, 'image', arquivoWeb);
      await enviarMensagem({
        salaId: id as string,
        autorId: profile!.id,
        midiaUrl: caminho,
        midiaTipo: 'imagem',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mensagens', id] }),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const enviarAudioMutation = useMutation({
    mutationFn: async (uriLocal: string) => {
      const caminho = await fazerUploadMidiaSala(id as string, uriLocal, 'audio');
      await enviarMensagem({
        salaId: id as string,
        autorId: profile!.id,
        midiaUrl: caminho,
        midiaTipo: 'audio',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mensagens', id] }),
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {ehStaff ? (
        <View className="flex-row items-center justify-between border-b border-slate-800 px-4 py-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name={sala.trancada ? 'lock-closed' : 'lock-open-outline'}
              size={16}
              color="#64748B"
            />
            <Text className="text-sm text-slate-400">
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

      <View style={{ paddingBottom: insets.bottom }}>
        {erro ? (
          <Text className="px-4 pt-2 text-sm text-danger dark:text-danger-dark">{erro}</Text>
        ) : null}
        <CaixaMensagem
          onEnviarTexto={(texto) => enviarMutation.mutate({ conteudo: texto })}
          onEnviarImagem={(uri, arquivoWeb) => enviarImagemMutation.mutate({ uri, arquivoWeb })}
          onEnviarAudio={(uri) => enviarAudioMutation.mutate(uri)}
          onErro={setErro}
          enviando={enviarMutation.isPending}
          placeholder="Escreve uma mensagem..."
          desabilitado={!podeEnviar}
          mensagemDesabilitado={
            sala.trancada
              ? 'Esta sala foi trancada pela moderação — só leitura.'
              : `Você está impedido de enviar mensagens até ${silenciadoAte ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(silenciadoAte) : ''}.`
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
