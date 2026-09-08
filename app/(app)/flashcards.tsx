import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  apagarFlashcard,
  listarFlashcardsDaMateria,
  listarFlashcardsDevidos,
  revisarFlashcard,
} from '@/features/flashcards/api';
import type { QualidadeRevisao } from '@/features/flashcards/regras';
import type { Flashcard } from '@/features/flashcards/types';
import { listarMateriasDaTurma } from '@/features/notas/api';

/** `window.confirm` no web, `Alert.alert` nativo — mesmo padrão já usado
 * em `perfil.tsx`/`gerenciar-materias.tsx` (ver comentário lá: `Alert.alert`
 * não tem UI nenhuma no navegador). */
function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Apagar flashcard', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: aoConfirmar },
  ]);
}

const BOTOES_QUALIDADE: { valor: QualidadeRevisao; rotulo: string; cor: string }[] = [
  { valor: 'errei', rotulo: 'Errei', cor: '#F87171' },
  { valor: 'dificil', rotulo: 'Difícil', cor: '#2DD4BF' },
  { valor: 'facil', rotulo: 'Fácil', cor: '#22C55E' },
];

/** Modo revisão: um cartão por vez, resposta escondida até tocar em
 * "Mostrar resposta" — depois disso os 3 botões de qualidade decidem o
 * próximo intervalo (ver `calcularProximaRevisao`) e avança pro próximo
 * cartão devido sozinho. */
function ModoRevisao({ cartoes, onTerminou }: { cartoes: Flashcard[]; onTerminou: () => void }) {
  const queryClient = useQueryClient();
  const [indice, setIndice] = useState(0);
  const [mostrarResposta, setMostrarResposta] = useState(false);

  const revisarMutation = useMutation({
    mutationFn: (params: { cartao: Flashcard; qualidade: QualidadeRevisao }) =>
      revisarFlashcard(params.cartao, params.qualidade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards-devidos'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-materia'] });
      setMostrarResposta(false);
      if (indice + 1 >= cartoes.length) {
        onTerminou();
      } else {
        setIndice(indice + 1);
      }
    },
  });

  if (cartoes.length === 0) {
    return (
      <EmptyState
        icon="checkmark-done-circle-outline"
        titulo="Nenhum cartão devido agora"
        descricao='Volta mais tarde ou cria novos cartões em "Meus cartões".'
      />
    );
  }

  const cartao = cartoes[indice];

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Text className="text-center text-xs text-slate-400">
        Cartão {indice + 1} de {cartoes.length}
      </Text>
      <View className="min-h-40 justify-center gap-3 rounded-xl border border-slate-800 bg-surface p-6 dark:bg-surface-dark">
        <Text className="text-lg font-semibold text-slate-100">{cartao.pergunta}</Text>
        {mostrarResposta ? (
          <Text className="text-base text-slate-400">{cartao.resposta}</Text>
        ) : null}
      </View>

      {!mostrarResposta ? (
        <Button
          label="Mostrar resposta"
          icon="eye-outline"
          onPress={() => setMostrarResposta(true)}
        />
      ) : (
        <View className="flex-row flex-wrap justify-center gap-2">
          {BOTOES_QUALIDADE.map((opcao) => (
            <Pressable
              key={opcao.valor}
              onPress={() => revisarMutation.mutate({ cartao, qualidade: opcao.valor })}
              disabled={revisarMutation.isPending}
              accessibilityRole="button"
              className="min-h-11 rounded-md px-5 py-2.5"
              style={{ backgroundColor: `${opcao.cor}1A` }}
            >
              <Text className="text-sm font-semibold" style={{ color: opcao.cor }}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** Lista de cartões por matéria, com apagar — sem criação manual aqui de
 * propósito: a forma principal de criar cartão é o botão "+ Flashcard"
 * embaixo de uma resposta da IA no chat de estudo (`estudo.tsx`), que já
 * chega com pergunta/resposta prontas; criar do zero aqui exigiria o
 * aluno digitar os dois lados à mão, que é mais fricção do que valor. */
function ListaPorMateria({ materiaId }: { materiaId: string }) {
  const queryClient = useQueryClient();
  const cartoesQuery = useQuery({
    queryKey: ['flashcards-materia', materiaId],
    queryFn: () => listarFlashcardsDaMateria(materiaId),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarFlashcard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards-materia', materiaId] }),
  });

  if (cartoesQuery.isLoading) return <LoadingState />;
  if (!cartoesQuery.data || cartoesQuery.data.length === 0) {
    return (
      <EmptyState
        icon="albums-outline"
        titulo="Nenhum flashcard nesta matéria ainda"
        descricao='Tira uma dúvida no chat de estudo e toca em "+ Flashcard" embaixo da resposta.'
      />
    );
  }

  return (
    <View className="gap-2">
      {cartoesQuery.data.map((cartao) => (
        <View
          key={cartao.id}
          className="gap-1 rounded-lg border border-slate-800 bg-surface p-4 dark:bg-surface-dark"
        >
          <Text className="text-sm font-semibold text-slate-100">{cartao.pergunta}</Text>
          <Text className="text-sm text-slate-400">{cartao.resposta}</Text>
          <View className="flex-row items-center justify-between pt-1">
            <Text className="text-xs text-slate-500">
              Próxima revisão:{' '}
              {new Intl.DateTimeFormat('pt-PT').format(new Date(cartao.proxima_revisao))}
            </Text>
            <Pressable
              onPress={() =>
                confirmar('Apagar este flashcard?', () => apagarMutation.mutate(cartao.id))
              }
              accessibilityRole="button"
              accessibilityLabel="Apagar flashcard"
              className="min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={16} color="#F87171" />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Flashcards() {
  const { profile } = useAuth();
  const [aba, setAba] = useState<'revisar' | 'todos'>('revisar');
  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const devidosQuery = useQuery({
    queryKey: ['flashcards-devidos', profile?.id],
    queryFn: () => listarFlashcardsDevidos(profile!.id),
    enabled: !!profile && aba === 'revisar',
  });

  const materiaAtual = useMemo(
    () => materiaSelecionada ?? materiasQuery.data?.[0]?.id ?? null,
    [materiaSelecionada, materiasQuery.data],
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row gap-2 border-b border-slate-800 p-3">
        {(['revisar', 'todos'] as const).map((opcao) => (
          <Pressable
            key={opcao}
            onPress={() => setAba(opcao)}
            accessibilityRole="button"
            accessibilityState={{ selected: aba === opcao }}
            className={`min-h-11 flex-1 items-center justify-center rounded-md border ${
              aba === opcao
                ? 'border-primary bg-primary/10 dark:border-primary-dark'
                : 'border-slate-700'
            }`}
          >
            <Text className="text-sm font-semibold text-slate-100">
              {opcao === 'revisar' ? 'Revisar agora' : 'Meus cartões'}
            </Text>
          </Pressable>
        ))}
      </View>

      {aba === 'revisar' ? (
        devidosQuery.isLoading ? (
          <LoadingState />
        ) : (
          <ModoRevisao
            cartoes={devidosQuery.data ?? []}
            onTerminou={() => devidosQuery.refetch()}
          />
        )
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4 pb-10">
          {materiasQuery.isLoading ? (
            <LoadingState />
          ) : (materiasQuery.data?.length ?? 0) === 0 ? (
            <EmptyState icon="book-outline" titulo="Sua turma ainda não tem matéria cadastrada" />
          ) : (
            <>
              <View className="flex-row flex-wrap gap-2">
                {(materiasQuery.data ?? []).map((materia) => (
                  <Pressable
                    key={materia.id}
                    onPress={() => setMateriaSelecionada(materia.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: materiaAtual === materia.id }}
                    className={`min-h-11 items-center justify-center rounded-md border px-4 ${
                      materiaAtual === materia.id
                        ? 'border-primary bg-primary/10 dark:border-primary-dark'
                        : 'border-slate-700'
                    }`}
                  >
                    <Text className="text-sm text-slate-100">{materia.nome}</Text>
                  </Pressable>
                ))}
              </View>
              {materiaAtual ? <ListaPorMateria materiaId={materiaAtual} /> : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
