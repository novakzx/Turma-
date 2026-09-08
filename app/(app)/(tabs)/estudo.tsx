import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

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
  ICONE_MODO,
  ROTULO_MODO,
  type MensagemChatIA,
  type ModoChatEstudo,
} from '@/features/estudo/types';
import { listarMateriasDaTurma } from '@/features/notas/api';
import { useEspacoReservadoBarraAbas } from '@/lib/barraAbas';

const MODOS: ModoChatEstudo[] = ['duvida', 'explicar', 'resumo', 'plano'];

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
      className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-full border px-4 ${
        selecionada
          ? 'border-primary bg-primary/10 dark:border-primary-dark'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <Ionicons name="book-outline" size={15} color={selecionada ? '#4F46E5' : '#94A3B8'} />
      <Text className="text-sm text-slate-900 dark:text-slate-100">{nome}</Text>
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
    <View className="mx-4 mt-4 gap-3 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <Ionicons name="stats-chart" size={16} color="#4F46E5" />
        <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Sua semana de estudo
        </Text>
      </View>
      <View className="flex-row justify-around">
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {totalPerguntas}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {totalPerguntas === 1 ? 'pergunta' : 'perguntas'}
          </Text>
        </View>
        <View className="items-center gap-0.5">
          <Text className="text-xl font-bold text-primary dark:text-primary-dark">
            {materiasRevisadas}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {materiasRevisadas === 1 ? 'matéria revisada' : 'matérias revisadas'}
          </Text>
        </View>
      </View>
      {diaMaisAtivo ? (
        <Text className="text-center text-xs text-slate-500 dark:text-slate-400">
          Seu dia mais ativo foi{' '}
          <Text className="font-semibold text-slate-700 dark:text-slate-300">{diaMaisAtivo}</Text>.
        </Text>
      ) : null}
    </View>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: MensagemChatIA }) {
  const doAluno = mensagem.papel === 'usuario';
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
          <Ionicons name="sparkles" size={14} color="#F59E0B" />
        </View>
      ) : null}
      <View
        className={`shrink rounded-2xl px-4 py-2.5 shadow-sm shadow-slate-900/5 ${
          doAluno
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-100 bg-surface dark:border-slate-800 dark:bg-surface-dark'
        }`}
      >
        <Text className={doAluno ? 'text-white' : 'text-slate-900 dark:text-slate-100'}>
          {mensagem.conteudo}
        </Text>
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
  const espacoBarraAbas = useEspacoReservadoBarraAbas();

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
      queryClient.invalidateQueries({ queryKey: ['chat-ia', materiaId] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleEnviar() {
    if (!materiaId) return;
    if (!texto.trim()) {
      setErro('Escreve sua pergunta antes de enviar.');
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
      <View className="gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        <View className="flex-row flex-wrap gap-2">
          {(materiasQuery.data ?? []).map((materia) => (
            <ChipMateria
              key={materia.id}
              nome={materia.nome}
              selecionada={materiaId === materia.id}
              onPress={() => setMateriaId(materia.id)}
            />
          ))}
        </View>
        {materiaId ? (
          <View className="flex-row flex-wrap gap-2">
            {MODOS.map((opcao) => (
              <Pressable
                key={opcao}
                onPress={() => setModo(opcao)}
                accessibilityRole="button"
                accessibilityState={{ selected: modo === opcao }}
                className={`min-h-11 flex-row items-center justify-center gap-1 rounded-full border px-3 ${
                  modo === opcao
                    ? 'border-accent bg-accent/10 dark:border-accent-dark'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Ionicons
                  name={ICONE_MODO[opcao]}
                  size={14}
                  color={modo === opcao ? '#F59E0B' : '#94A3B8'}
                />
                <Text className="text-xs text-slate-900 dark:text-slate-100">
                  {ROTULO_MODO[opcao]}
                </Text>
              </Pressable>
            ))}
          </View>
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
          renderItem={({ item }) => <BolhaMensagem mensagem={item} />}
        />
      )}

      {materiaId ? (
        // `paddingBottom` calculado (não um `pb-*` fixo do Tailwind) por
        // causa de um bug real relatado no iPhone: a barra de abas é
        // flutuante (`position: absolute`, `(tabs)/_layout.tsx`) e um
        // valor fixo não soma o inset de segurança do sistema (home
        // indicator no iPhone) — variava por aparelho, então um número
        // "chutado" que funcionava no preview web não sobrava o
        // suficiente num iPhone de verdade e a barra tampava o botão
        // "Enviar" de novo. `useEspacoReservadoBarraAbas` (mesma fonte que
        // posiciona a própria barra) resolve isso pros dois lugares juntos.
        <View
          className="gap-2 border-t border-slate-100 p-3 dark:border-slate-800"
          style={{ paddingBottom: espacoBarraAbas }}
        >
          {erro ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
            </View>
          ) : null}
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                placeholder="Escreve sua pergunta..."
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
