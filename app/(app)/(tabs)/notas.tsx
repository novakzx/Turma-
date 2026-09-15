import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarAvaliacao,
  atualizarNotaAvaliacao,
  buscarNotaMaximaDaEscola,
  criarAvaliacao,
  listarAvaliacoes,
  listarMateriasDaTurma,
} from '@/features/notas/api';
import { calcularMediaAtual, calcularNotaNecessaria } from '@/features/notas/regras';
import type { Avaliacao } from '@/features/notas/types';

const formatadorNota = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });

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
        selecionada ? 'border-primary bg-primary/10 dark:border-primary-dark' : 'border-slate-200'
      }`}
    >
      <Ionicons name="book-outline" size={15} color={selecionada ? '#0095F6' : '#969696'} />
      <Text className="text-sm text-slate-900">{nome}</Text>
    </Pressable>
  );
}

function LinhaAvaliacao({
  avaliacao,
  notaMaxima,
  onSalvarNota,
  onApagar,
  salvandoNota,
}: {
  avaliacao: Avaliacao;
  notaMaxima: number;
  onSalvarNota: (nota: number) => void;
  onApagar: () => void;
  salvandoNota: boolean;
}) {
  // Editar a nota é um campo inline, não Alert.prompt — essa API só
  // existe no iOS (undefined no Android e no web), travaria o lançamento
  // de nota nos outros dois.
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function handleSalvar() {
    const nota = Number(valor.replace(',', '.'));
    if (!valor.trim() || Number.isNaN(nota) || nota < 0 || nota > notaMaxima) {
      setErro(`Informe um número entre 0 e ${notaMaxima}.`);
      return;
    }
    setErro(null);
    onSalvarNota(nota);
    setEditando(false);
    setValor('');
  }

  return (
    <View className="gap-2 rounded-lg border border-slate-200 bg-surface p-3 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-medium text-slate-900">{avaliacao.nome}</Text>
          <Text className="text-xs text-slate-500">
            Peso {formatadorNota.format(avaliacao.peso)} ·{' '}
            {avaliacao.nota === null ? 'pendente' : `Nota ${formatadorNota.format(avaliacao.nota)}`}
          </Text>
        </View>
        {avaliacao.nota === null && !editando ? (
          <Pressable
            onPress={() => setEditando(true)}
            accessibilityRole="button"
            accessibilityLabel={`Lançar nota de ${avaliacao.nome}`}
            className="min-h-11 min-w-11 flex-row items-center gap-1 rounded-md bg-primary/10 px-3 dark:bg-primary-dark/20"
          >
            <Ionicons name="add-circle-outline" size={16} color="#0095F6" />
            <Text className="text-primary dark:text-primary-dark">Lançar</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onApagar}
          accessibilityRole="button"
          accessibilityLabel={`Apagar ${avaliacao.nome}`}
          className="ml-2 min-h-11 min-w-11 items-center justify-center rounded-md px-3"
        >
          <Ionicons name="trash-outline" size={18} color="#F87171" />
        </Pressable>
      </View>

      {editando ? (
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <TextField
              label={`Nota (0-${notaMaxima})`}
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              error={erro ?? undefined}
              autoFocus
            />
          </View>
          <Button label="Salvar" icon="checkmark" onPress={handleSalvar} loading={salvandoNota} />
        </View>
      ) : null}
    </View>
  );
}

export default function Notas() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [mediaDesejada, setMediaDesejada] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPeso, setNovoPeso] = useState('');
  const [novaNota, setNovaNota] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  // Formulário de "Nova avaliação" escondido por padrão (pedido do
  // usuário, "deixe o sistema de notas mais fácil") — antes ficava
  // sempre aberto embaixo da lista, então quem só queria ver a média ou
  // conferir uma nota já lançada tinha que rolar passando por 3 campos
  // de formulário toda vez. Abre sozinho se a matéria ainda não tem
  // avaliação nenhuma (nesse caso é a primeira coisa que precisa fazer).
  const [novaAvaliacaoAberta, setNovaAvaliacaoAberta] = useState(false);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const notaMaximaQuery = useQuery({
    queryKey: ['nota-maxima', profile?.escola_id],
    queryFn: () => buscarNotaMaximaDaEscola(profile?.escola_id as string),
    enabled: !!profile?.escola_id,
  });

  const avaliacoesQuery = useQuery({
    queryKey: ['avaliacoes', materiaId],
    queryFn: () => listarAvaliacoes(materiaId as string),
    enabled: !!materiaId,
  });

  const invalidarAvaliacoes = () =>
    queryClient.invalidateQueries({ queryKey: ['avaliacoes', materiaId] });

  const criarMutation = useMutation({
    mutationFn: criarAvaliacao,
    onSuccess: () => {
      setNovoNome('');
      setNovoPeso('');
      setNovaNota('');
      setNovaAvaliacaoAberta(false);
      invalidarAvaliacoes();
    },
    onError: (error) => setErroForm(mensagemDeErro(error)),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarAvaliacao,
    onSuccess: invalidarAvaliacoes,
  });

  const atualizarNotaMutation = useMutation({
    mutationFn: (params: { id: string; nota: number | null }) =>
      atualizarNotaAvaliacao(params.id, params.nota),
    onSuccess: invalidarAvaliacoes,
  });

  const avaliacoesParaCalculo = useMemo(
    () => (avaliacoesQuery.data ?? []).map((a) => ({ peso: a.peso, nota: a.nota })),
    [avaliacoesQuery.data],
  );
  const mediaAtual = calcularMediaAtual(avaliacoesParaCalculo);
  const notaMaxima = notaMaximaQuery.data ?? 10;

  const resultadoCalculo = useMemo(() => {
    const desejada = Number(mediaDesejada.replace(',', '.'));
    if (!mediaDesejada.trim() || Number.isNaN(desejada)) return null;
    return calcularNotaNecessaria({
      mediaDesejada: desejada,
      notaMaxima,
      avaliacoes: avaliacoesParaCalculo,
    });
  }, [mediaDesejada, notaMaxima, avaliacoesParaCalculo]);

  function handleAdicionarAvaliacao() {
    if (!profile || !materiaId) return;
    const peso = Number(novoPeso.replace(',', '.'));
    const nota = novaNota.trim() ? Number(novaNota.replace(',', '.')) : null;

    if (!novoNome.trim()) {
      setErroForm('Informe um nome pra avaliação (ex.: "Teste 1").');
      return;
    }
    if (!novoPeso.trim() || Number.isNaN(peso) || peso <= 0) {
      setErroForm('Informe um peso válido (maior que zero).');
      return;
    }
    if (nota !== null && (Number.isNaN(nota) || nota < 0 || nota > notaMaxima)) {
      setErroForm(`A nota precisa estar entre 0 e ${notaMaxima}, ou em branco se ainda não saiu.`);
      return;
    }
    setErroForm(null);

    criarMutation.mutate({
      alunoId: profile.id,
      materiaId,
      nome: novoNome.trim(),
      peso,
      nota,
      data: null,
    });
  }

  function handleApagar(id: string, nome: string) {
    Alert.alert('Apagar avaliação', `Apagar "${nome}"? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => apagarMutation.mutate(id) },
    ]);
  }

  if (materiasQuery.isLoading) return <LoadingState />;
  if (materiasQuery.isError) {
    return (
      <EmptyState
        titulo="Não deu pra carregar as matérias"
        descricao="Verifica sua conexão e tenta de novo."
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
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 p-4 pb-28"
    >
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

      {!materiaId ? (
        <EmptyState
          icon="hand-left-outline"
          titulo="Escolha uma matéria"
          descricao="Toque num chip acima pra ver as avaliações."
        />
      ) : avaliacoesQuery.isLoading ? (
        <LoadingState />
      ) : avaliacoesQuery.isError ? (
        <EmptyState
          titulo="Não deu pra carregar as avaliações"
          onTentarNovo={() => avaliacoesQuery.refetch()}
        />
      ) : (
        <>
          {mediaAtual !== null ? (
            <View className="flex-row items-center gap-3 rounded-xl bg-primary/10 p-4 dark:bg-primary-dark/10">
              <Ionicons name="stats-chart" size={22} color="#0095F6" />
              <View className="flex-1">
                <Text className="text-xs text-slate-500">Sua média atual</Text>
                <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
                  {formatadorNota.format(mediaAtual)}
                  <Text className="text-sm font-normal text-slate-500"> / {notaMaxima}</Text>
                </Text>
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            {(avaliacoesQuery.data?.length ?? 0) === 0 ? (
              <Text className="text-sm text-slate-500">
                Nenhuma avaliação lançada nessa matéria ainda.
              </Text>
            ) : (
              (avaliacoesQuery.data ?? []).map((avaliacao) => (
                <LinhaAvaliacao
                  key={avaliacao.id}
                  avaliacao={avaliacao}
                  notaMaxima={notaMaxima}
                  salvandoNota={
                    atualizarNotaMutation.isPending &&
                    atualizarNotaMutation.variables?.id === avaliacao.id
                  }
                  onSalvarNota={(nota) => atualizarNotaMutation.mutate({ id: avaliacao.id, nota })}
                  onApagar={() => handleApagar(avaliacao.id, avaliacao.nome)}
                />
              ))
            )}
          </View>

          {/* Escondido atrás de um botão (pedido do usuário, "notas mais
              fácil") — só abre o formulário de 3 campos quando alguém
              realmente vai lançar uma avaliação nova, em vez de deixar
              sempre visível ocupando espaço antes disso. Abre sozinho
              quando a matéria ainda não tem avaliação nenhuma — nesse
              caso é a única coisa que dá pra fazer na tela mesmo. */}
          {!novaAvaliacaoAberta && (avaliacoesQuery.data?.length ?? 0) > 0 ? (
            <Pressable
              onPress={() => setNovaAvaliacaoAberta(true)}
              accessibilityRole="button"
              className="min-h-11 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface p-4 dark:bg-surface-dark"
            >
              <Ionicons name="add-circle-outline" size={18} color="#0095F6" />
              <Text className="text-sm font-semibold text-primary dark:text-primary-dark">
                Nova avaliação
              </Text>
            </Pressable>
          ) : (
            <View className="gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="add-circle-outline" size={16} color="#0095F6" />
                  <Text className="text-sm font-semibold text-slate-700">Nova avaliação</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setNovaAvaliacaoAberta(false);
                    setErroForm(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  className="min-h-11 min-w-11 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#969696" />
                </Pressable>
              </View>
              <TextField
                label="Nome"
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder="Teste 2"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField
                    label="Peso"
                    value={novoPeso}
                    onChangeText={setNovoPeso}
                    keyboardType="decimal-pad"
                    placeholder="30"
                  />
                </View>
                <View className="flex-1">
                  <TextField
                    label={`Nota (0-${notaMaxima}, opcional)`}
                    value={novaNota}
                    onChangeText={setNovaNota}
                    keyboardType="decimal-pad"
                    placeholder="pendente"
                  />
                </View>
              </View>
              <Text className="text-xs text-slate-500">
                Peso é quanto essa avaliação vale na média final — se todas valem o mesmo, usa
                sempre o mesmo número (ex.: 1) em cada uma.
              </Text>
              {erroForm ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="alert-circle" size={14} color="#F87171" />
                  <Text className="text-sm text-danger dark:text-danger-dark">{erroForm}</Text>
                </View>
              ) : null}
              <Button
                label="Adicionar"
                icon="add"
                variant="secondary"
                onPress={handleAdicionarAvaliacao}
                loading={criarMutation.isPending}
              />
            </View>
          )}

          <View className="gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calculator-outline" size={16} color="#0095F6" />
              <Text className="text-sm font-semibold text-slate-700">Quanto preciso tirar?</Text>
            </View>
            <TextField
              label={`Média desejada (0-${notaMaxima})`}
              value={mediaDesejada}
              onChangeText={setMediaDesejada}
              keyboardType="decimal-pad"
              placeholder="7"
            />
            {resultadoCalculo?.status === 'ok' ? (
              <View className="flex-row items-center gap-2 rounded-lg bg-primary/10 p-3 dark:bg-primary-dark/10">
                <Ionicons name="trending-up" size={20} color="#0095F6" />
                <Text className="flex-1 text-base font-semibold text-primary dark:text-primary-dark">
                  Você precisa de {formatadorNota.format(resultadoCalculo.notaNecessaria)} nas
                  avaliações que faltam.
                </Text>
              </View>
            ) : resultadoCalculo?.status === 'impossivel' ? (
              <View className="flex-row items-center gap-2 rounded-lg bg-danger/10 p-3 dark:bg-danger-dark/10">
                <Ionicons name="close-circle" size={20} color="#F87171" />
                <Text className="flex-1 text-base font-semibold text-danger dark:text-danger-dark">
                  Não dá mais pra bater essa média só com essa prova.
                </Text>
              </View>
            ) : resultadoCalculo?.status === 'ja_atingida' ? (
              <View className="flex-row items-center gap-2 rounded-lg bg-success/10 p-3 dark:bg-success-dark/10">
                <Ionicons name="trophy" size={20} color="#22C55E" />
                <Text className="flex-1 text-base font-semibold text-success dark:text-success-dark">
                  Já bateu essa média — nem precisa de nota nas que faltam.
                </Text>
              </View>
            ) : resultadoCalculo?.status === 'sem_pendentes' ? (
              <Text className="text-sm text-slate-500">
                Todas as avaliações já têm nota lançada.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}
