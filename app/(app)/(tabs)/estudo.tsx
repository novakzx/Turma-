import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  listarHistoricoChat,
} from '@/features/estudo/api';
import {
  analisarApresentacao,
  formatarTempo,
  separarGabarito,
  type Slide,
} from '@/features/estudo/regras';
import {
  ICONE_MODO,
  ROTULO_MODO,
  type MensagemChatIA,
  type ModoChatEstudo,
} from '@/features/estudo/types';
import { criarFlashcard } from '@/features/flashcards/api';
import { listarMateriasDaTurma } from '@/features/notas/api';

const MODOS: ModoChatEstudo[] = ['duvida', 'explicar', 'resumo', 'plano', 'prova', 'apresentacao'];

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
      className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-md border px-4 ${
        selecionada ? 'border-primary bg-primary/10 dark:border-primary-dark' : 'border-slate-700'
      }`}
    >
      <Ionicons name="book-outline" size={15} color={selecionada ? '#8B5CF6' : '#94A3B8'} />
      <Text className="text-sm text-slate-100">{nome}</Text>
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
    <View className="mx-4 mt-4 gap-3 rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <Ionicons name="stats-chart" size={16} color="#8B5CF6" />
        <Text className="text-sm font-semibold text-slate-100">Sua semana de estudo</Text>
      </View>
      <View className="flex-row justify-around">
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {totalPerguntas}
          </Text>
          <Text className="text-xs text-slate-400">
            {totalPerguntas === 1 ? 'pergunta' : 'perguntas'}
          </Text>
        </View>
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {materiasRevisadas}
          </Text>
          <Text className="text-xs text-slate-400">
            {materiasRevisadas === 1 ? 'matéria revisada' : 'matérias revisadas'}
          </Text>
        </View>
      </View>
      {diaMaisAtivo ? (
        <Text className="text-center text-xs text-slate-400">
          Seu dia mais ativo foi{' '}
          <Text className="font-semibold text-slate-300">{diaMaisAtivo}</Text>.
        </Text>
      ) : null}
    </View>
  );
}

/** Um slide da apresentação (modo `apresentacao`) — título + pontos em
 * bullet, num cartão separado por slide em vez de um bloco de texto só,
 * pra ficar claro que é conteúdo estruturado pra usar numa aula/trabalho. */
function CartaoSlide({ numero, titulo, pontos }: Slide & { numero: number }) {
  return (
    <View className="shrink gap-1.5 rounded-lg border border-slate-800 bg-surface p-3 dark:bg-surface-dark">
      <View className="flex-row items-center gap-1.5">
        <View className="h-5 w-5 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
          <Text className="text-[10px] font-bold text-accent dark:text-accent-dark">{numero}</Text>
        </View>
        <Text className="flex-1 font-semibold text-slate-100">{titulo}</Text>
      </View>
      {pontos.map((ponto, indice) => (
        <View key={indice} className="flex-row gap-1.5 pl-1">
          <Text className="text-slate-400">•</Text>
          <Text className="flex-1 text-sm text-slate-300">{ponto}</Text>
        </View>
      ))}
    </View>
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
  // Só a IA gera apresentação — mensagem do próprio aluno (o pedido,
  // ex.: "fotossíntese") nunca teria o formato de slide, então nem vale
  // a pena checar (evita um falso positivo bizarro se o aluno colar um
  // texto parecido por acaso).
  const slides = !doAluno ? analisarApresentacao(enunciado) : null;

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
        {slides ? (
          slides.map((slide, indice) => (
            <CartaoSlide
              key={indice}
              numero={indice + 1}
              titulo={slide.titulo}
              pontos={slide.pontos}
            />
          ))
        ) : (
          <View
            className={`shrink rounded-lg px-4 py-2.5 ${
              doAluno
                ? 'bg-primary dark:bg-primary-dark'
                : 'border border-slate-800 bg-surface dark:bg-surface-dark'
            }`}
          >
            <Text className={doAluno ? 'text-white' : 'text-slate-100'}>{enunciado}</Text>
          </View>
        )}

        {gabarito ? (
          mostrarGabarito ? (
            <View className="shrink rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 dark:border-accent-dark/30 dark:bg-accent-dark/10">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
                Gabarito
              </Text>
              <Text className="text-slate-100">{gabarito}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setMostrarGabarito(true)}
              accessibilityRole="button"
              className="min-h-11 flex-row items-center gap-1 self-start rounded-md border border-accent/40 px-3 dark:border-accent-dark/40"
            >
              <Ionicons name="key-outline" size={14} color="#2DD4BF" />
              <Text className="text-xs font-semibold text-accent dark:text-accent-dark">
                Ver gabarito
              </Text>
            </Pressable>
          )
        ) : null}

        {/* "+ Flashcard" só faz sentido numa resposta de verdade da IA
            (não na prova, que já tem gabarito próprio, não na apresentação
            de slides, nem na mensagem do próprio aluno). */}
        {!doAluno && !gabarito && !slides ? (
          <Pressable
            onPress={() => flashcardMutation.mutate()}
            disabled={flashcardMutation.isPending || flashcardMutation.isSuccess}
            accessibilityRole="button"
            className="min-h-11 flex-row items-center gap-1 self-start rounded-md border border-slate-700 px-3"
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
    mutationFn: enviarMensagemChat,
    onSuccess: () => {
      setTexto('');
      setErro(null);
      // Prova gerada com sucesso: dispara o cronômetro de 15 min agora,
      // não no clique de "Enviar" — só faz sentido contar o tempo depois
      // que as perguntas de verdade chegaram.
      if (modo === 'prova') setSegundosRestantesProva(DURACAO_PROVA_SEGUNDOS);
      queryClient.invalidateQueries({ queryKey: ['chat-ia', materiaId] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleEnviar() {
    if (!materiaId) return;
    if (!texto.trim()) {
      setErro(
        modo === 'prova'
          ? 'Escreve o assunto da prova antes de gerar (ex.: "frações" ou "2ª Guerra Mundial").'
          : modo === 'apresentacao'
            ? 'Escreve o assunto da apresentação antes de gerar (ex.: "fotossíntese").'
            : 'Escreve sua pergunta antes de enviar.',
      );
      return;
    }
    setErro(null);
    enviarMutation.mutate({ materiaId, mensagem: texto.trim(), modo });
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
      <View className="gap-2 border-b border-slate-800 py-3">
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
            onPress={() => router.push('/flashcards')}
            accessibilityRole="button"
            accessibilityLabel="Flashcards"
            className="min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-700"
          >
            <Ionicons name="albums-outline" size={18} color="#8B5CF6" />
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
                className={`min-h-11 flex-row items-center justify-center gap-1 rounded-md border px-3 ${
                  modo === opcao
                    ? 'border-accent bg-accent/10 dark:border-accent-dark'
                    : 'border-slate-700'
                }`}
              >
                <Ionicons
                  name={ICONE_MODO[opcao]}
                  size={14}
                  color={modo === opcao ? '#2DD4BF' : '#94A3B8'}
                />
                <Text className="text-xs text-slate-100">{ROTULO_MODO[opcao]}</Text>
              </Pressable>
            ))}
            {modo === 'prova' && segundosRestantesProva !== null ? (
              <View className="flex-row items-center gap-1 rounded-md bg-danger/10 px-3 py-1.5 dark:bg-danger-dark/10">
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
          className="gap-2 border-t border-slate-800 p-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {enviarMutation.isPending ? (
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text className="text-sm text-slate-400">
                A IA está a pensar... pode demorar alguns segundos.
              </Text>
            </View>
          ) : erro ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color="#F87171" />
              <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
            </View>
          ) : null}
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                placeholder={
                  modo === 'prova'
                    ? 'Assunto da prova (ex.: frações)...'
                    : modo === 'apresentacao'
                      ? 'Assunto da apresentação (ex.: fotossíntese)...'
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
