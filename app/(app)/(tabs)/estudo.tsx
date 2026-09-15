import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  buscarEstatisticaSemanal,
  enviarMensagemChat,
  escolherFotoAnotacao,
  fazerUploadFotoAnotacao,
  listarHistoricoChat,
  obterUrlAssinadaFotoEstudo,
  type FotoEscolhida,
} from '@/features/estudo/api';
import { formatarTempo, separarGabarito } from '@/features/estudo/regras';
import {
  ICONE_MODO,
  ROTULO_MODO,
  type MensagemChatIA,
  type ModoChatEstudo,
} from '@/features/estudo/types';
import { criarFlashcard } from '@/features/flashcards/api';
import { listarMateriasDaTurma } from '@/features/notas/api';

const MODOS: ModoChatEstudo[] = ['duvida', 'explicar', 'resumo', 'plano', 'prova'];

/** Duração fixa da prova simulada (15 min) — é só um cronômetro de UX
 * pra dar noção de tempo real de prova, não um prazo de verdade que
 * bloqueia nada no servidor (diferente do "silenciar usuário", ver
 * CLAUDE.md — aqui não há nada de segurança em jogo, então o relógio do
 * cliente é a fonte certa). */
const DURACAO_PROVA_SEGUNDOS = 15 * 60;

function ChipMateria({
  nome,
  selecionada,
  onPress,
}: {
  nome: string;
  selecionada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionada }}
      className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-full px-4 ${
        selecionada ? 'bg-primary dark:bg-primary-dark' : 'bg-slate-100'
      }`}
    >
      <Ionicons name="book-outline" size={15} color={selecionada ? '#FFFFFF' : '#464555'} />
      <Text className={`text-sm font-medium ${selecionada ? 'text-white' : 'text-slate-700'}`}>
        {nome}
      </Text>
    </Pressable>
  );
}

/** Resumo de uso do chat com IA nos últimos 7 dias (pedido do usuário)
 * — some sozinho se ainda não houver nenhuma pergunta na semana, pra
 * não competir com o "Escolha uma matéria" de quem nunca usou. */
function CartaoEstatisticaSemanal({ alunoId }: { alunoId: string }) {
  const query = useQuery({
    queryKey: ['estatistica-semanal-estudo', alunoId],
    queryFn: () => buscarEstatisticaSemanal(alunoId),
  });

  if (!query.data || query.data.totalPerguntas === 0) return null;
  const { totalPerguntas, materiasRevisadas, diaMaisAtivo } = query.data;

  return (
    <View className="mx-4 mt-4 gap-3 rounded-xl border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <Ionicons name="stats-chart" size={16} color="#8B5CF6" />
        <Text className="text-sm font-semibold text-slate-900">Sua semana de estudo</Text>
      </View>
      <View className="flex-row justify-around">
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {totalPerguntas}
          </Text>
          <Text className="text-xs text-slate-500">
            {totalPerguntas === 1 ? 'pergunta' : 'perguntas'}
          </Text>
        </View>
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {materiasRevisadas}
          </Text>
          <Text className="text-xs text-slate-500">
            {materiasRevisadas === 1 ? 'matéria revisada' : 'matérias revisadas'}
          </Text>
        </View>
      </View>
      {diaMaisAtivo ? (
        <Text className="text-center text-xs text-slate-500">
          Seu dia mais ativo foi{' '}
          <Text className="font-semibold text-slate-700">{diaMaisAtivo}</Text>.
        </Text>
      ) : null}
    </View>
  );
}

/** Miniatura da foto de anotação anexada numa mensagem (pedido do
 * usuário — "pra ia ver fotos das anotacoes dos alunos"). Mesmo padrão
 * de `ImagemPost`/`FotoPerfil`: bucket privado, então busca a própria
 * URL assinada (cache do TanStack Query evita repetir a cada re-render). */
function MiniaturaFoto({ caminho }: { caminho: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['url-assinada-foto-estudo', caminho],
    queryFn: () => obterUrlAssinadaFotoEstudo(caminho),
    staleTime: 50 * 60 * 1000,
  });

  if (isLoading || !url) {
    return (
      <View className="h-40 w-40 items-center justify-center rounded-xl bg-slate-100">
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      className="h-40 w-40 rounded-xl"
      resizeMode="cover"
      accessibilityLabel="Foto da anotação enviada"
    />
  );
}

function BolhaMensagem({
  mensagem,
  perguntaAnterior,
  materiaId,
  alunoId,
}: {
  mensagem: MensagemChatIA;
  /** Mensagem do aluno logo antes desta (só faz sentido pra mensagem da
   * IA) — usada como `pergunta` do flashcard criado a partir da resposta. */
  perguntaAnterior: MensagemChatIA | null;
  materiaId: string;
  alunoId: string;
}) {
  const doAluno = mensagem.papel === 'usuario';
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const { enunciado, gabarito } = separarGabarito(mensagem.conteudo);

  const flashcardMutation = useMutation({
    mutationFn: () =>
      criarFlashcard({
        alunoId,
        materiaId,
        pergunta: perguntaAnterior?.conteudo ?? enunciado.slice(0, 200),
        resposta: enunciado,
      }),
  });

  return (
    // `shrink` (não só o `max-w-[85%]` do pai) é o que faz de verdade —
    // sem isso, dentro de um `flex-row`, a bolha não respeita o teto de
    // 85% e o texto simplesmente não quebra linha: a mensagem da IA
    // vazava pra fora da tela (variando por aparelho, já que a largura
    // de tela é diferente em cada iPhone/Android — o bug "muda com a
    // resolução" era exatamente essa falta de encolhimento, não algo
    // ligado a um device específico).
    <View
      className={`max-w-[85%] shrink flex-row items-end gap-2 ${doAluno ? 'self-end' : 'self-start'}`}
    >
      {!doAluno ? (
        <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
          <Ionicons name="sparkles" size={14} color="#2DD4BF" />
        </View>
      ) : null}
      <View className="shrink gap-1.5">
        {mensagem.midia_url ? <MiniaturaFoto caminho={mensagem.midia_url} /> : null}
        <View
          className={`shrink px-4 py-2.5 ${
            doAluno
              ? 'rounded-2xl rounded-br-md bg-primary dark:bg-primary-dark'
              : 'rounded-2xl rounded-bl-md bg-surface shadow-sm dark:bg-surface-dark'
          }`}
        >
          <Text className={doAluno ? 'text-white' : 'text-slate-900'}>{enunciado}</Text>
        </View>

        {gabarito ? (
          mostrarGabarito ? (
            <View className="shrink rounded-xl bg-accent/10 px-4 py-2.5 dark:bg-accent-dark/10">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
                Gabarito
              </Text>
              <Text className="text-slate-900">{gabarito}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setMostrarGabarito(true)}
              accessibilityRole="button"
              className="min-h-11 flex-row items-center gap-1 self-start rounded-full bg-accent/10 px-3 dark:bg-accent-dark/15"
            >
              <Ionicons name="key-outline" size={14} color="#2DD4BF" />
              <Text className="text-xs font-semibold text-accent dark:text-accent-dark">
                Ver gabarito
              </Text>
            </Pressable>
          )
        ) : null}

        {/* "+ Flashcard" só faz sentido numa resposta de verdade da IA
            (não na prova, que já tem gabarito próprio, nem na mensagem
            do próprio aluno). */}
        {!doAluno && !gabarito ? (
          <Pressable
            onPress={() => flashcardMutation.mutate()}
            disabled={flashcardMutation.isPending || flashcardMutation.isSuccess}
            accessibilityRole="button"
            className="min-h-11 flex-row items-center gap-1 self-start rounded-full bg-slate-100 px-3"
          >
            <Ionicons
              name={flashcardMutation.isSuccess ? 'checkmark' : 'albums-outline'}
              size={14}
              color="#8B5CF6"
            />
            <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
              {flashcardMutation.isSuccess ? 'Flashcard criado' : 'Criar flashcard'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function Estudo() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoChatEstudo>('duvida');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [segundosRestantesProva, setSegundosRestantesProva] = useState<number | null>(null);
  // Foto de anotação escolhida, ainda não enviada (pedido do usuário —
  // "pra ia ver fotos das anotacoes dos alunos"). Só o preview local
  // (`uri`) — o upload de verdade só acontece no envio, pra não deixar
  // foto órfã no Storage se o aluno trocar de ideia e apagar o anexo
  // antes de mandar.
  const [fotoEscolhida, setFotoEscolhida] = useState<FotoEscolhida | null>(null);
  // Barra de abas agora é docada (não mais flutuante/`position: absolute`
  // — ver `(tabs)/_layout.tsx`), então o React Navigation já reserva o
  // espaço dela sozinho: só falta somar o inset de segurança do rodapé,
  // mesmo padrão já usado fora das abas (`sala/[id].tsx`, `conversa/
  // [id].tsx`).
  const insets = useSafeAreaInsets();

  // Cronômetro da prova simulada: um único interval por toda a vida do
  // componente (evita recriar/limpar a cada segundo) — o próprio setter
  // decide se conta ou não (`s === null` = prova ainda não começou;
  // `s <= 0` = já zerou, fica parado em 0). Setar o mesmo valor (`null`
  // ou `0` repetido) não gera re-render de mais — React ignora `setState`
  // pro mesmo valor primitivo.
  useEffect(() => {
    const interval = setInterval(() => {
      setSegundosRestantesProva((s) => (s === null || s <= 0 ? s : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const historicoQuery = useQuery({
    queryKey: ['chat-ia', materiaId],
    queryFn: () => listarHistoricoChat(materiaId as string),
    enabled: !!materiaId,
  });

  const enviarMutation = useMutation({
    // Com foto: faz o upload pro bucket privado primeiro (pedido do
    // usuário — "pra ia ver fotos das anotacoes dos alunos"), só depois
    // manda a mensagem com o caminho — a Edge Function busca os bytes
    // ela mesma a partir daí, o app nunca manda a imagem inteira pra IA.
    mutationFn: async (params: {
      materiaId: string;
      mensagem: string;
      modo: ModoChatEstudo;
      foto: FotoEscolhida | null;
    }) => {
      const fotoCaminho = params.foto
        ? await fazerUploadFotoAnotacao(profile!.id, params.foto)
        : null;
      return enviarMensagemChat({
        materiaId: params.materiaId,
        mensagem: params.mensagem,
        modo: params.modo,
        fotoCaminho,
      });
    },
    onSuccess: () => {
      setTexto('');
      setFotoEscolhida(null);
      setErro(null);
      // Prova gerada com sucesso: dispara o cronômetro de 15 min agora,
      // não no clique de "Enviar" — só faz sentido contar o tempo depois
      // que as perguntas de verdade chegaram.
      if (modo === 'prova') setSegundosRestantesProva(DURACAO_PROVA_SEGUNDOS);
      queryClient.invalidateQueries({ queryKey: ['chat-ia', materiaId] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  async function handleEscolherFoto() {
    try {
      const foto = await escolherFotoAnotacao();
      if (foto) setFotoEscolhida(foto);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function handleEnviar() {
    if (!materiaId) return;
    // Com foto anexada, a pergunta é opcional — "o que está aqui?" já é
    // uma pergunta válida sem precisar digitar nada; sem foto, continua
    // exigindo texto (é a única coisa que a IA teria pra responder).
    if (!texto.trim() && !fotoEscolhida) {
      setErro(
        modo === 'prova'
          ? 'Escreve o assunto da prova antes de gerar (ex.: "frações" ou "2ª Guerra Mundial").'
          : 'Escreve sua pergunta antes de enviar.',
      );
      return;
    }
    setErro(null);
    enviarMutation.mutate({
      materiaId,
      mensagem: texto.trim() || 'O que está escrito/desenhado nessa foto? Pode me ajudar?',
      modo,
      foto: fotoEscolhida,
    });
  }

  if (materiasQuery.isLoading) return <LoadingState />;
  if (materiasQuery.isError) {
    return (
      <EmptyState
        titulo="Não deu pra carregar as matérias"
        onTentarNovo={() => materiasQuery.refetch()}
      />
    );
  }
  if ((materiasQuery.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon="book-outline"
        titulo="Sua turma ainda não tem matéria cadastrada"
        descricao="Fale com a coordenação — matéria é cadastrada por ela."
      />
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="gap-2 border-b border-slate-100 bg-surface py-3 dark:bg-surface-dark">
        <View className="flex-row items-center gap-2 pl-3 pr-3">
          {/* Rolagem horizontal em vez de quebrar linha (`flex-wrap`) —
              pedido do usuário: com as 2 fileiras de chip (matéria + modo)
              quebrando linha, a tela ficava "poluída" antes de qualquer
              conversa aparecer. Uma fileira só, rolável, cabe em qualquer
              largura de tela sem empurrar o chat pra baixo. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-2"
            className="flex-1"
          >
            {(materiasQuery.data ?? []).map((materia) => (
              <ChipMateria
                key={materia.id}
                nome={materia.nome}
                selecionada={materiaId === materia.id}
                onPress={() => setMateriaId(materia.id)}
              />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => router.push('/ferramentas-estudo')}
            accessibilityRole="button"
            accessibilityLabel="Ferramentas de cálculo"
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name="calculator-outline" size={18} color="#8B5CF6" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/flashcards')}
            accessibilityRole="button"
            accessibilityLabel="Flashcards"
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name="albums-outline" size={18} color="#8B5CF6" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/apresentacoes')}
            accessibilityRole="button"
            accessibilityLabel="Apresentações"
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name="easel-outline" size={18} color="#8B5CF6" />
          </Pressable>
        </View>
        {materiaId ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-2 pl-3 pr-3"
          >
            {MODOS.map((opcao) => (
              <Pressable
                key={opcao}
                onPress={() => setModo(opcao)}
                accessibilityRole="button"
                accessibilityState={{ selected: modo === opcao }}
                className={`min-h-11 flex-row items-center justify-center gap-1 rounded-full px-3 ${
                  modo === opcao ? 'bg-accent/15 dark:bg-accent-dark/20' : 'bg-slate-100'
                }`}
              >
                <Ionicons
                  name={ICONE_MODO[opcao]}
                  size={14}
                  color={modo === opcao ? '#0D9488' : '#464555'}
                />
                <Text className="text-xs font-medium text-slate-700">{ROTULO_MODO[opcao]}</Text>
              </Pressable>
            ))}
            {modo === 'prova' && segundosRestantesProva !== null ? (
              <View className="flex-row items-center gap-1 rounded-full bg-danger/10 px-3 py-1.5 dark:bg-danger-dark/10">
                <Ionicons name="timer-outline" size={14} color="#F87171" />
                <Text className="text-xs font-semibold text-danger dark:text-danger-dark">
                  {formatarTempo(segundosRestantesProva)}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      {!materiaId ? (
        <View className="flex-1">
          {profile ? <CartaoEstatisticaSemanal alunoId={profile.id} /> : null}
          <EmptyState
            icon="hand-left-outline"
            titulo="Escolha uma matéria"
            descricao="Toque num chip acima pra começar."
          />
        </View>
      ) : historicoQuery.isLoading ? (
        <LoadingState />
      ) : historicoQuery.isError ? (
        <EmptyState
          titulo="Não deu pra carregar a conversa"
          onTentarNovo={() => historicoQuery.refetch()}
        />
      ) : (
        <FlatList
          className="flex-1"
          data={historicoQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 p-4"
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              titulo="Ainda não tem conversa nessa matéria"
              descricao="Escolhe o modo acima e manda sua primeira pergunta."
            />
          }
          renderItem={({ item, index }) => (
            <BolhaMensagem
              mensagem={item}
              perguntaAnterior={
                item.papel === 'assistente' ? (historicoQuery.data?.[index - 1] ?? null) : null
              }
              materiaId={materiaId as string}
              alunoId={profile!.id}
            />
          )}
        />
      )}

      {materiaId ? (
        // A barra de abas agora é docada (não mais flutuante) — o React
        // Navigation já reserva o espaço dela sozinho, então só falta
        // somar o inset de segurança do rodapé (home indicator no
        // iPhone), mesmo padrão de `sala/[id].tsx`/`conversa/[id].tsx`.
        <View
          className="gap-2 border-t border-slate-100 bg-surface p-3 shadow-sm dark:bg-surface-dark"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {enviarMutation.isPending ? (
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text className="text-sm text-slate-500">
                {fotoEscolhida
                  ? 'A IA está a olhar a foto... pode demorar um pouco mais que o normal.'
                  : 'A IA está a pensar... pode demorar alguns segundos.'}
              </Text>
            </View>
          ) : erro ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color="#F87171" />
              <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
            </View>
          ) : null}
          {fotoEscolhida ? (
            <View className="flex-row items-center gap-2 self-start rounded-xl bg-slate-100 p-2">
              <Image
                source={{ uri: fotoEscolhida.uri }}
                className="h-14 w-14 rounded-lg"
                resizeMode="cover"
              />
              <Text className="text-xs text-slate-500">Foto anexada</Text>
              <Pressable
                onPress={() => setFotoEscolhida(null)}
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
                className="min-h-11 min-w-11 items-center justify-center"
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </Pressable>
            </View>
          ) : null}
          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={handleEscolherFoto}
              accessibilityRole="button"
              accessibilityLabel="Anexar foto de anotação"
              className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100"
            >
              <Ionicons name="camera-outline" size={20} color="#8B5CF6" />
            </Pressable>
            <View className="flex-1">
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                placeholder={
                  fotoEscolhida
                    ? 'O que você quer saber sobre a foto? (opcional)'
                    : modo === 'prova'
                      ? 'Assunto da prova (ex.: frações)...'
                      : 'Escreve sua pergunta...'
                }
                multiline
              />
            </View>
            <Button
              label=""
              icon="send"
              onPress={handleEnviar}
              loading={enviarMutation.isPending}
              accessibilityLabel="Enviar"
            />
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
