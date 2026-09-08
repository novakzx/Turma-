import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import {
  aceitarPedido,
  apagarMensagemDireta,
  assinarMensagensDiretas,
  buscarConversa,
  enviarMensagemDireta,
  fazerUploadMidiaConversa,
  listarMensagens,
  listarParticipantes,
  obterUrlAssinadaConversa,
  recusarOuSair,
  type MensagemComAutor,
} from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { supabase } from '@/lib/supabase';

/** Instagram não repete hora em cada balão — só um divisor centralizado
 * quando passa muito tempo entre mensagens. 30 min é o mesmo limiar que
 * apps de mensagem em geral usam pra decidir "isso é uma conversa nova". */
const LIMIAR_NOVO_GRUPO_MS = 30 * 60 * 1000;

function formatarDivisor(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const hora = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(
    data,
  );
  if (data.toDateString() === hoje.toDateString()) return hora;
  const dataCurta = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(
    data,
  );
  return `${dataCurta} · ${hora}`;
}

type ItemLista =
  | { chave: string; tipo: 'divisor'; label: string }
  | {
      chave: string;
      tipo: 'mensagem';
      mensagem: MensagemComAutor;
      primeiroDoGrupo: boolean;
      ultimoDoGrupo: boolean;
    };

/** Agrupa mensagens consecutivas do mesmo autor (visual "empilhado" do
 * Instagram) e insere um divisor de horário quando passa tempo demais
 * entre uma mensagem e a próxima — em vez do carimbo de hora repetido
 * em todo balão que o design antigo tinha. */
function construirItensLista(mensagens: MensagemComAutor[]): ItemLista[] {
  const itens: ItemLista[] = [];
  mensagens.forEach((mensagem, index) => {
    const anterior = mensagens[index - 1];
    const gapAnteriorMs = anterior
      ? new Date(mensagem.criado_em).getTime() - new Date(anterior.criado_em).getTime()
      : Infinity;

    if (!anterior || gapAnteriorMs >= LIMIAR_NOVO_GRUPO_MS) {
      itens.push({
        chave: `divisor-${mensagem.id}`,
        tipo: 'divisor',
        label: formatarDivisor(mensagem.criado_em),
      });
    }

    const proxima = mensagens[index + 1];
    const gapProximoMs = proxima
      ? new Date(proxima.criado_em).getTime() - new Date(mensagem.criado_em).getTime()
      : Infinity;

    itens.push({
      chave: mensagem.id,
      tipo: 'mensagem',
      mensagem,
      primeiroDoGrupo:
        !anterior ||
        anterior.autor_id !== mensagem.autor_id ||
        gapAnteriorMs >= LIMIAR_NOVO_GRUPO_MS,
      ultimoDoGrupo:
        !proxima || proxima.autor_id !== mensagem.autor_id || gapProximoMs >= LIMIAR_NOVO_GRUPO_MS,
    });
  });
  return itens;
}

function DivisorTempo({ label }: { label: string }) {
  return (
    <View className="my-3 items-center">
      <Text className="text-xs font-medium text-slate-500">{label}</Text>
    </View>
  );
}

function LinhaMensagem({
  mensagem,
  souEu,
  primeiroDoGrupo,
  ultimoDoGrupo,
  podeApagar,
  onApagar,
}: {
  mensagem: MensagemComAutor;
  souEu: boolean;
  primeiroDoGrupo: boolean;
  ultimoDoGrupo: boolean;
  podeApagar: boolean;
  onApagar: () => void;
}) {
  if (mensagem.apagada) {
    return (
      <View className={`mt-3 max-w-[75%] ${souEu ? 'self-end' : 'self-start'}`}>
        <Text className="text-xs italic text-slate-500">Mensagem apagada</Text>
      </View>
    );
  }

  // Balões consecutivos do mesmo autor "grudam" um no outro (o cantinho
  // reto do lado de fora vira arredondado só no primeiro/último da
  // sequência) — é esse empilhamento que dá a cara de Instagram/WhatsApp,
  // em vez de balões soltos e iguais um embaixo do outro.
  const cantoExterno = souEu
    ? `${primeiroDoGrupo ? '' : 'rounded-tr-md '}${ultimoDoGrupo ? '' : 'rounded-br-md '}`
    : `${primeiroDoGrupo ? '' : 'rounded-tl-md '}${ultimoDoGrupo ? '' : 'rounded-bl-md '}`;

  return (
    <View
      className={`${primeiroDoGrupo ? 'mt-3' : 'mt-0.5'} max-w-[75%] gap-1 ${souEu ? 'items-end self-end' : 'items-start self-start'}`}
    >
      <View
        className={`overflow-hidden rounded-lg ${mensagem.midia_tipo === 'imagem' ? 'p-1' : 'px-4 py-2.5'} ${cantoExterno}${
          souEu
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-800 bg-surface dark:bg-surface-dark'
        }`}
      >
        {mensagem.midia_tipo === 'imagem' && mensagem.midia_url ? (
          <ImagemChat caminho={mensagem.midia_url} obterUrl={obterUrlAssinadaConversa} />
        ) : mensagem.midia_tipo === 'audio' && mensagem.midia_url ? (
          <BolhaAudio
            caminho={mensagem.midia_url}
            obterUrl={obterUrlAssinadaConversa}
            corIcone={souEu ? '#FFFFFF' : '#8B5CF6'}
            corTexto={souEu ? 'text-white' : 'text-slate-100'}
          />
        ) : null}
        {mensagem.conteudo ? (
          <TextoComMencoes
            texto={mensagem.conteudo}
            className={souEu ? 'text-white' : 'text-slate-100'}
            mencaoClassName={souEu ? 'font-semibold text-white underline' : undefined}
          />
        ) : null}
      </View>
      {!souEu || podeApagar ? (
        <View className="flex-row items-center gap-2 px-1">
          {!souEu ? (
            <BotaoDenunciar tipoConteudo="mensagem_direta" conteudoId={mensagem.id} />
          ) : null}
          {podeApagar ? (
            <Pressable
              onPress={onApagar}
              accessibilityRole="button"
              accessibilityLabel="Apagar mensagem"
              className="min-h-11 min-w-11 items-center justify-center px-1"
            >
              <Ionicons name="trash-outline" size={14} color="#F87171" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CabecalhoConversa({
  nome,
  foto,
  ehGrupo,
  onPress,
}: {
  nome: string;
  foto?: string | null;
  ehGrupo: boolean;
  onPress?: () => void;
}) {
  // Cor do texto vem em JS, não de classe `dark:` do Tailwind — conteúdo
  // dentro do header do React Navigation segue esse padrão em todo o app
  // (ver headerTintColor/ícones do headerRight em `(tabs)/_layout.tsx`),
  // porque esse cabeçalho já é estilizado via `headerStyle` inline. Fixo
  // em claro de propósito (redesign "dark-first", pedido do usuário): o
  // fundo do header é sempre escuro agora (ver tailwind.config.js), então
  // não existe mais um caso "fundo claro" que precisasse de texto escuro
  // aqui — antes disso, o `colorScheme` decidia entre os dois.
  const corTexto = '#F8FAFC';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress ? `Ver ${ehGrupo ? 'participantes' : 'perfil'} de ${nome}` : undefined
      }
      className="min-h-11 flex-row items-center gap-2 py-1"
    >
      {ehGrupo ? (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
          <Ionicons name="people" size={16} color="#2DD4BF" />
        </View>
      ) : (
        <FotoPerfil caminho={foto ?? null} nome={nome} tamanho={32} />
      )}
      <Text
        numberOfLines={1}
        style={{ color: corTexto }}
        className="max-w-[160px] text-base font-semibold"
      >
        {nome}
      </Text>
    </Pressable>
  );
}

export default function DetalheConversa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  // Tela empilhada (sem barra de abas) — a caixa de mensagem cola direto
  // no fundo real da tela, então precisa somar o inset de segurança do
  // sistema (home indicator no iPhone) à mão, senão fica colada/quase
  // encoberta nele. A barra de abas em si não precisa mais desse cálculo
  // manual — `(tabs)/_layout.tsx` deixa a altura por conta do
  // `@react-navigation/bottom-tabs`, que já soma esse inset sozinho.
  const insets = useSafeAreaInsets();

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
    // Faltava isto: sem invalidar `participantes`, `ehPedidoPendente`
    // (calculado a partir de `participantesQuery.data`) nunca atualizava
    // depois de aceitar/recusar — o próprio update no banco funcionava
    // certo, mas o botão "Aceitar" continuava aparecendo pra sempre,
    // dando a impressão de que não tinha feito nada.
    queryClient.invalidateQueries({ queryKey: ['participantes', id] });
  }

  const enviarMutation = useMutation({
    mutationFn: (params: {
      conteudo?: string;
      midiaUrl?: string;
      midiaTipo?: 'imagem' | 'audio';
    }) => enviarMensagemDireta({ conversaId: id, autorId: profile!.id, ...params }),
    onSuccess: invalidarTudo,
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const enviarImagemMutation = useMutation({
    mutationFn: async (uriLocal: string) => {
      const caminho = await fazerUploadMidiaConversa(id, uriLocal, 'image');
      await enviarMensagemDireta({
        conversaId: id,
        autorId: profile!.id,
        midiaUrl: caminho,
        midiaTipo: 'imagem',
      });
    },
    onSuccess: invalidarTudo,
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const enviarAudioMutation = useMutation({
    mutationFn: async (uriLocal: string) => {
      const caminho = await fazerUploadMidiaConversa(id, uriLocal, 'audio');
      await enviarMensagemDireta({
        conversaId: id,
        autorId: profile!.id,
        midiaUrl: caminho,
        midiaTipo: 'audio',
      });
    },
    onSuccess: invalidarTudo,
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
  const ehGrupo = conversa.tipo === 'grupo';
  const titulo = ehGrupo
    ? (conversa.nome ?? 'Grupo')
    : (outroParticipante?.profiles?.nome ?? 'Conversa');

  const itensLista = construirItensLista(mensagensQuery.data ?? []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <CabecalhoConversa
              nome={titulo}
              foto={outroParticipante?.profiles?.foto_url}
              ehGrupo={ehGrupo}
              onPress={() =>
                router.push(
                  ehGrupo
                    ? `/grupo-participantes/${id}`
                    : `/perfil/${outroParticipante?.profile_id}`,
                )
              }
            />
          ),
          headerRight: ehGrupo
            ? () => (
                <Pressable
                  onPress={() => router.push(`/grupo-participantes/${id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Participantes do grupo"
                  className="min-h-11 min-w-11 items-center justify-center"
                >
                  <Ionicons name="people-outline" size={22} color="#8B5CF6" />
                </Pressable>
              )
            : undefined,
        }}
      />

      <FlatList
        data={itensLista}
        keyExtractor={(item) => item.chave}
        inverted={false}
        contentContainerClassName="gap-0 px-4 py-4"
        renderItem={({ item }) =>
          item.tipo === 'divisor' ? (
            <DivisorTempo label={item.label} />
          ) : (
            <LinhaMensagem
              mensagem={item.mensagem}
              souEu={item.mensagem.autor_id === profile?.id}
              primeiroDoGrupo={item.primeiroDoGrupo}
              ultimoDoGrupo={item.ultimoDoGrupo}
              podeApagar={item.mensagem.autor_id === profile?.id && !item.mensagem.apagada}
              onApagar={() => apagarMutation.mutate(item.mensagem.id)}
            />
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            titulo="Nenhuma mensagem ainda"
            descricao="Manda a primeira!"
          />
        }
      />

      {ehPedidoPendente ? (
        <View
          className="gap-2 border-t border-slate-800 p-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-sm text-slate-400">
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
        <View style={{ paddingBottom: insets.bottom }}>
          {erro ? (
            <Text className="px-4 pt-2 text-sm text-danger dark:text-danger-dark">{erro}</Text>
          ) : null}
          <CaixaMensagem
            onEnviarTexto={(texto) => enviarMutation.mutate({ conteudo: texto })}
            onEnviarImagem={(uri) => enviarImagemMutation.mutate(uri)}
            onEnviarAudio={(uri) => enviarAudioMutation.mutate(uri)}
            onErro={setErro}
            enviando={enviarMutation.isPending}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
