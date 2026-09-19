import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BolhaAudio } from '@/components/ui/BolhaAudio';
import { Button } from '@/components/ui/Button';
import { CaixaMensagem } from '@/components/ui/CaixaMensagem';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { ImagemChat } from '@/components/ui/ImagemChat';
import { TextoComMencoes } from '@/components/ui/TextoComMencoes';
import { useAssinante } from '@/features/assinatura/useAssinante';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { useTema } from '@/features/configuracoes/TemaProvider';
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import {
  aceitarPedido,
  apagarMensagemDireta,
  assinarMensagensDiretas,
  atualizarTemaConversa,
  buscarConversa,
  enviarMensagemDireta,
  fazerUploadMidiaConversa,
  listarMensagens,
  listarParticipantes,
  obterUrlAssinadaConversa,
  recusarOuSair,
  type MensagemComAutor,
} from '@/features/mensagens/api';
import { calcularSequenciaConversa } from '@/features/mensagens/regras';
import { buscarTemaConversa, TEMAS_CONVERSA, type TemaConversa } from '@/features/mensagens/temas';
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

function DivisorTempo({ label, tema }: { label: string; tema: TemaConversa | null }) {
  return (
    <View className="my-3 items-center">
      <Text
        className={`text-xs font-medium ${
          tema ? 'rounded-full bg-black/20 px-2 py-0.5 text-white' : 'text-slate-500'
        }`}
      >
        {label}
      </Text>
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
  tema,
}: {
  mensagem: MensagemComAutor;
  souEu: boolean;
  primeiroDoGrupo: boolean;
  ultimoDoGrupo: boolean;
  podeApagar: boolean;
  onApagar: () => void;
  /** Tema de conversa ativo (pedido do usuário, ver `temas.ts`) — `null`
   * mantém as classes `bg-primary`/`bg-surface` de sempre. Quando tem
   * tema, a cor vem inline (`style`) porque é dinâmica por conversa,
   * não uma das cores fixas do Tailwind. */
  tema: TemaConversa | null;
}) {
  if (mensagem.apagada) {
    return (
      <View className={`mt-3 max-w-[75%] ${souEu ? 'self-end' : 'self-start'}`}>
        <Text
          className={`text-xs italic ${tema ? 'text-white/70' : 'text-slate-500'}`}
        >
          Mensagem apagada
        </Text>
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

  const corTextoConteudo = tema ? (souEu ? '#FFFFFF' : tema.corTextoOutra) : undefined;

  return (
    <View
      className={`${primeiroDoGrupo ? 'mt-3' : 'mt-0.5'} max-w-[75%] gap-1 ${souEu ? 'items-end self-end' : 'items-start self-start'}`}
    >
      <View
        className={`overflow-hidden rounded-lg ${mensagem.midia_tipo === 'imagem' ? 'p-1' : 'px-4 py-2.5'} ${cantoExterno}${
          tema
            ? ''
            : souEu
              ? 'bg-primary dark:bg-primary-dark'
              : 'border border-slate-200 bg-surface dark:bg-surface-dark'
        }`}
        style={tema ? { backgroundColor: souEu ? tema.corMinha : tema.corOutra } : undefined}
      >
        {mensagem.midia_tipo === 'imagem' && mensagem.midia_url ? (
          <ImagemChat
            caminho={mensagem.midia_url}
            obterUrl={obterUrlAssinadaConversa}
            urlPreAssinada={mensagem.urlMidiaAssinada}
          />
        ) : mensagem.midia_tipo === 'audio' && mensagem.midia_url ? (
          <BolhaAudio
            caminho={mensagem.midia_url}
            obterUrl={obterUrlAssinadaConversa}
            urlPreAssinada={mensagem.urlMidiaAssinada}
            corIcone={souEu || tema ? '#FFFFFF' : '#0095F6'}
            corTexto={souEu || tema ? 'text-white' : 'text-slate-900'}
          />
        ) : null}
        {mensagem.conteudo ? (
          <TextoComMencoes
            texto={mensagem.conteudo}
            className={tema ? undefined : souEu ? 'text-white' : 'text-slate-900'}
            style={corTextoConteudo ? { color: corTextoConteudo } : undefined}
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

/**
 * Popup do foguinho (pedido do usuário — "o foguinho tem que ser
 * interativo igual o do tiktok... a pessoa pode colocar nome e etc" +
 * confirmação explícita depois de eu perguntar: "sim pode fazer isso
 * do foguinho"): antes o foguinho era só um número mudo ao lado do
 * nome; agora é tocável e abre um cartão com foto grande, nome, idade
 * (quando cadastrada) e a contagem — "Ver perfil" continua levando pro
 * perfil completo de sempre, pra não perder a navegação que já existia.
 */
function PopupFoguinho({
  aberto,
  onFechar,
  nome,
  foto,
  idade,
  sequencia,
  onVerPerfil,
}: {
  aberto: boolean;
  onFechar: () => void;
  nome: string;
  foto?: string | null;
  idade?: number | null;
  sequencia: number;
  onVerPerfil: () => void;
}) {
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      {/* Backdrop (fecha ao tocar fora) e cartão são IRMÃOS dentro deste
          `View` só de layout — nunca um `Pressable` dentro de outro
          `Pressable`. O backdrop cobre a tela inteira via `absolute
          inset-0` (fora do fluxo normal); o cartão, em fluxo normal
          logo depois no JSX, pinta por cima dele — tocar no cartão
          nunca "vaza" pro backdrop atrás, sem precisar aninhar nada
          (mesmo achado do bug da página de notificações: `Pressable`
          vira `<button>` no web, e `<button>` dentro de `<button>`
          quebra a hidratação). */}
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <Pressable
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          className="absolute inset-0"
        />
        <View className="w-full max-w-xs items-center gap-3 rounded-lg border border-slate-200 bg-surface p-6 dark:bg-surface-dark">
          <FotoPerfil caminho={foto ?? null} nome={nome} tamanho={72} />
          <View className="items-center gap-0.5">
            <Text className="text-lg font-bold text-slate-900">{nome}</Text>
            {idade ? <Text className="text-xs text-slate-500">{idade} anos</Text> : null}
          </View>
          <View className="flex-row items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 dark:bg-danger-dark/10">
            <Ionicons name="flame" size={18} color="#F97316" />
            <Text className="text-sm font-semibold text-slate-900">
              {sequencia} {sequencia === 1 ? 'dia seguido' : 'dias seguidos'} conversando
            </Text>
          </View>
          <Text className="text-center text-xs text-slate-500">
            Mandem mensagem hoje pra não perder o foguinho.
          </Text>
          <View className="w-full flex-row gap-2 pt-1">
            <Pressable
              onPress={onFechar}
              accessibilityRole="button"
              className="min-h-11 flex-1 items-center justify-center rounded-full bg-slate-100"
            >
              <Text className="text-sm font-semibold text-slate-700">Fechar</Text>
            </Pressable>
            <Pressable
              onPress={onVerPerfil}
              accessibilityRole="button"
              className="min-h-11 flex-1 items-center justify-center rounded-full bg-primary dark:bg-primary-dark"
            >
              <Text className="text-sm font-semibold text-white">Ver perfil</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CabecalhoConversa({
  nome,
  foto,
  idade,
  ehGrupo,
  sequencia,
  onPress,
}: {
  nome: string;
  foto?: string | null;
  idade?: number | null;
  ehGrupo: boolean;
  /** Foguinho da conversa (pedido do usuário — "tipo o do tiktok"): dias
   * seguidos em que os dois mandaram mensagem. `undefined`/`0` não
   * mostra nada (não faz sentido gabar "0 dias seguidos"). */
  sequencia?: number;
  onPress?: () => void;
}) {
  const [popupAberto, setPopupAberto] = useState(false);
  // Cor do texto vem em JS, não de classe `dark:` do Tailwind — conteúdo
  // dentro do header do React Navigation segue esse padrão em todo o app
  // (ver headerTintColor/ícones do headerRight em `(tabs)/_layout.tsx`),
  // porque esse cabeçalho já é estilizado via `headerStyle` inline.
  //
  // ACHADO ao vivo: o comentário antigo aqui dizia "fixo em escuro de
  // propósito, o fundo do header é sempre claro agora" — isso ficou
  // desatualizado assim que o modo escuro de verdade voltou (o header
  // passou a ter fundo escuro de novo em `(app)/_layout.tsx`), e
  // ninguém tinha notado que o texto continuava preto sobre fundo
  // preto nessa tela específica. Corrigido lendo `useTema()`, mesmo
  // padrão do resto do header.
  const { escuro } = useTema();
  const corTexto = escuro ? '#F5F5F5' : '#000000';

  return (
    // O botão do foguinho é IRMÃO do resto do cabeçalho, nunca aninhado
    // dentro do mesmo `Pressable` — achado ao vivo no bug da página de
    // notificações (ver `LinhaPerfil`): no web, `Pressable` vira
    // `<button>`, e um `<button>` dentro de outro `<button>` quebra a
    // hidratação.
    <View className="min-h-11 flex-row items-center gap-2 py-1">
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={
          onPress ? `Ver ${ehGrupo ? 'participantes' : 'perfil'} de ${nome}` : undefined
        }
        className="min-h-11 flex-row items-center gap-2"
      >
        {ehGrupo ? (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
            <Ionicons name="people" size={16} color="#0095F6" />
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
      {sequencia ? (
        <>
          <Pressable
            onPress={() => setPopupAberto(true)}
            accessibilityRole="button"
            accessibilityLabel={`${sequencia} ${sequencia === 1 ? 'dia seguido' : 'dias seguidos'} conversando com ${nome} — toque pra ver detalhes`}
            className="min-h-11 flex-row items-center gap-0.5 px-1"
          >
            <Ionicons name="flame" size={14} color="#F97316" />
            <Text style={{ color: corTexto }} className="text-xs font-semibold">
              {sequencia}
            </Text>
          </Pressable>
          <PopupFoguinho
            aberto={popupAberto}
            onFechar={() => setPopupAberto(false)}
            nome={nome}
            foto={foto}
            idade={idade}
            sequencia={sequencia}
            onVerPerfil={() => {
              setPopupAberto(false);
              onPress?.();
            }}
          />
        </>
      ) : null}
    </View>
  );
}

function AmostraTema({
  tema,
  selecionado,
  bloqueado,
  onPress,
}: {
  tema: TemaConversa | null;
  selecionado: boolean;
  bloqueado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tema ? `Tema ${tema.nome}` : 'Tema padrão'}
      className="w-[22%] items-center gap-1.5"
    >
      <View
        className={`h-16 w-16 items-center justify-center rounded-full ${
          selecionado
            ? 'border-2 border-primary dark:border-primary-dark'
            : 'border border-slate-200 dark:border-slate-700'
        }`}
      >
        {tema ? (
          <LinearGradient
            colors={tema.gradiente}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: '100%', width: '100%', borderRadius: 9999 }}
            className="items-center justify-center"
          >
            <Text className="text-xl">{tema.emoji}</Text>
          </LinearGradient>
        ) : (
          <View className="h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Ionicons name="ban-outline" size={20} color="#94A3B8" />
          </View>
        )}
        {bloqueado && !selecionado ? (
          <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-slate-900">
            <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
          </View>
        ) : null}
        {selecionado ? (
          <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-primary dark:bg-primary-dark">
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        className="text-xs font-medium text-slate-700 dark:text-slate-300"
      >
        {tema ? tema.nome : 'Padrão'}
      </Text>
    </Pressable>
  );
}

/**
 * Seletor de tema visual da conversa (pedido do usuário, anexando print
 * de um app de mensagens com fundo em gradiente colorido por conversa —
 * "deixe tipo assim os temas"). Recurso Premium (já citado assim na
 * descrição padrão de `BannerPremium`), então quem não assina vê os
 * temas (pra saber que existem e dar vontade de assinar) mas toque num
 * tema bloqueado só abre a tela de assinatura — nunca falha silencioso.
 * "Padrão" (sem tema) nunca é bloqueado, mesmo pra quem não assina —
 * é só a volta ao visual de sempre, não é o recurso premium em si.
 */
function SeletorTema({
  aberto,
  onFechar,
  temaAtualId,
  ehAssinante,
  onEscolher,
}: {
  aberto: boolean;
  onFechar: () => void;
  temaAtualId: string | null;
  ehAssinante: boolean;
  onEscolher: (id: string | null) => void;
}) {
  const insets = useSafeAreaInsets();

  function selecionar(id: string | null) {
    if (id && !ehAssinante) {
      onFechar();
      router.push('/assinatura');
      return;
    }
    onEscolher(id);
  }

  return (
    <Modal visible={aberto} transparent animationType="slide" onRequestClose={onFechar}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          className="absolute inset-0"
        />
        <View
          className="gap-4 rounded-t-2xl bg-surface p-6 dark:bg-surface-dark"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Tema da conversa
            </Text>
            <Pressable
              onPress={onFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              className="min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons name="close" size={22} color="#94A3B8" />
            </Pressable>
          </View>
          {!ehAssinante ? (
            <Pressable
              onPress={() => {
                onFechar();
                router.push('/assinatura');
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 dark:bg-primary-dark/10"
            >
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Temas são um recurso Premium — toque pra assinar.
              </Text>
            </Pressable>
          ) : null}
          <View className="flex-row flex-wrap justify-between gap-y-4">
            <AmostraTema
              tema={null}
              selecionado={!temaAtualId}
              bloqueado={false}
              onPress={() => selecionar(null)}
            />
            {TEMAS_CONVERSA.map((tema) => (
              <AmostraTema
                key={tema.id}
                tema={tema}
                selecionado={temaAtualId === tema.id}
                bloqueado={!ehAssinante}
                onPress={() => selecionar(tema.id)}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
  const ehAssinante = useAssinante();
  const [pickerTemaAberto, setPickerTemaAberto] = useState(false);

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
    mutationFn: async ({ uri, arquivoWeb }: { uri: string; arquivoWeb: File | null }) => {
      const caminho = await fazerUploadMidiaConversa(id, uri, 'image', arquivoWeb);
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

  const temaMutation = useMutation({
    mutationFn: (novoTema: string | null) => atualizarTemaConversa(id, novoTema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversa', id] });
      setPickerTemaAberto(false);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
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

  // Foguinho (pedido do usuário — "tipo o do tiktok"): só faz sentido
  // 1:1, não em grupo. Reaproveita `mensagensQuery.data` (já carregado
  // pra desenhar o chat) em vez de bater o banco de novo.
  const sequenciaConversa =
    !ehGrupo && profile && outroParticipante
      ? calcularSequenciaConversa(mensagensQuery.data ?? [], profile.id, outroParticipante.profile_id)
      : 0;

  // Tema visual da conversa (pedido do usuário, ver `temas.ts`) — mesmo
  // sem ser assinante o `tema` gravado continua sendo respeitado aqui
  // (só a TROCA de tema é bloqueada no seletor); assim ninguém perde o
  // visual escolhido se a assinatura expirar sem querer no meio disso.
  const tema = buscarTemaConversa(conversa.tema);

  const listaMensagens = (
    <FlatList
      data={itensLista}
      keyExtractor={(item) => item.chave}
      inverted={false}
      contentContainerClassName="gap-0 px-4 py-4"
      renderItem={({ item }) =>
        item.tipo === 'divisor' ? (
          <DivisorTempo label={item.label} tema={tema} />
        ) : (
          <LinhaMensagem
            mensagem={item.mensagem}
            souEu={item.mensagem.autor_id === profile?.id}
            primeiroDoGrupo={item.primeiroDoGrupo}
            ultimoDoGrupo={item.ultimoDoGrupo}
            podeApagar={item.mensagem.autor_id === profile?.id && !item.mensagem.apagada}
            onApagar={() => apagarMutation.mutate(item.mensagem.id)}
            tema={tema}
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
  );

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
              idade={outroParticipante?.profiles?.idade}
              ehGrupo={ehGrupo}
              sequencia={sequenciaConversa}
              onPress={() =>
                router.push(
                  ehGrupo
                    ? `/grupo-participantes/${id}`
                    : `/perfil/${outroParticipante?.profile_id}`,
                )
              }
            />
          ),
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable
                onPress={() => setPickerTemaAberto(true)}
                accessibilityRole="button"
                accessibilityLabel="Tema da conversa"
                className="min-h-11 min-w-11 items-center justify-center"
              >
                <Ionicons name="color-palette-outline" size={22} color="#0095F6" />
              </Pressable>
              {ehGrupo ? (
                <Pressable
                  onPress={() => router.push(`/grupo-participantes/${id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Participantes do grupo"
                  className="min-h-11 min-w-11 items-center justify-center"
                >
                  <Ionicons name="people-outline" size={22} color="#0095F6" />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />

      <SeletorTema
        aberto={pickerTemaAberto}
        onFechar={() => setPickerTemaAberto(false)}
        temaAtualId={conversa.tema}
        ehAssinante={ehAssinante}
        onEscolher={(novoTema) => temaMutation.mutate(novoTema)}
      />

      {tema ? (
        <LinearGradient colors={tema.gradiente} style={{ flex: 1 }}>
          {listaMensagens}
        </LinearGradient>
      ) : (
        listaMensagens
      )}

      {ehPedidoPendente ? (
        <View
          className="gap-2 border-t border-slate-200 p-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-sm text-slate-500">
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
            onEnviarImagem={(uri, arquivoWeb) => enviarImagemMutation.mutate({ uri, arquivoWeb })}
            onEnviarAudio={(uri) => enviarAudioMutation.mutate(uri)}
            onErro={setErro}
            enviando={enviarMutation.isPending}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
