import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
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
      <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</Text>
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
        <Text className="text-xs italic text-slate-400 dark:text-slate-500">Mensagem apagada</Text>
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
        className={`rounded-2xl px-4 py-2.5 ${cantoExterno}${
          souEu
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-100 bg-surface dark:border-slate-800 dark:bg-surface-dark'
        }`}
      >
        <Text className={souEu ? 'text-white' : 'text-slate-900 dark:text-slate-100'}>
          {mensagem.conteudo}
        </Text>
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
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
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
  // porque esse cabeçalho já é estilizado via `headerStyle` inline (que
  // reage à preferência real de tema), enquanto uma classe `dark:` teria
  // texto escuro sobre fundo escuro — achado testando de verdade: o nome
  // simplesmente sumia, sem erro nenhum.
  const { colorScheme } = useColorScheme();
  const corTexto = colorScheme === 'dark' ? '#F1F5F9' : '#0F172A';

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
          <Ionicons name="people" size={16} color="#F59E0B" />
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
  const ehGrupo = conversa.tipo === 'grupo';
  const titulo = ehGrupo
    ? (conversa.nome ?? 'Grupo')
    : (outroParticipante?.profiles?.nome ?? 'Conversa');

  function handleEnviar() {
    if (!texto.trim()) return;
    setErro(null);
    enviarMutation.mutate();
  }

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
                  <Ionicons name="people-outline" size={22} color="#4F46E5" />
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
        <View className="gap-1.5 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {erro ? (
            <Text className="px-2 text-sm text-danger dark:text-danger-dark">{erro}</Text>
          ) : null}
          {/* Campo em pílula, sem label visível — o estilo minimalista do
              Instagram ("Mensagem...") em vez do TextField padrão do app
              (que sempre mostra um label acima, certo pra formulário mas
              destoante aqui). Acessibilidade mantida via
              `accessibilityLabel` direto no TextInput. */}
          <View className="flex-row items-end gap-2">
            <View className="min-h-11 flex-1 flex-row items-center rounded-full border border-slate-200 bg-surface px-4 dark:border-slate-700 dark:bg-surface-dark">
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Mensagem..."
                placeholderTextColor="#94A3B8"
                multiline
                accessibilityLabel="Mensagem"
                className="max-h-28 flex-1 py-2.5 text-base text-slate-900 dark:text-slate-100"
              />
            </View>
            <Pressable
              onPress={handleEnviar}
              disabled={enviarMutation.isPending || !texto.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              className={`h-11 w-11 items-center justify-center rounded-full ${
                texto.trim() ? 'bg-primary dark:bg-primary-dark' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              {enviarMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color={texto.trim() ? '#FFFFFF' : '#94A3B8'} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
