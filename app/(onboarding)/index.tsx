import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  buscarMeuPedidoPendente,
  concluirOnboarding,
  criarTurma,
  listarEscolas,
  listarTurmasPorEscola,
  pedirEntradaNaTurma,
} from '@/features/onboarding/api';

function ItemSelecionavel({
  label,
  selecionado,
  icone,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      className={`min-h-11 flex-row items-center gap-2 rounded-2xl border px-4 py-3 ${
        selecionado
          ? 'border-primary bg-primary/10 dark:border-primary-dark'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {icone ? (
        <Ionicons name={icone} size={16} color={selecionado ? '#4F46E5' : '#94A3B8'} />
      ) : null}
      <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">{label}</Text>
      {selecionado ? <Ionicons name="checkmark-circle" size={20} color="#4F46E5" /> : null}
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [escolaId, setEscolaId] = useState<string | null>(null);
  const [turmaId, setTurmaId] = useState<string | null>(null);
  const [criandoTurma, setCriandoTurma] = useState(false);
  const [novoNomeTurma, setNovoNomeTurma] = useState('');
  const [novoAnoTurma, setNovoAnoTurma] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const escolasQuery = useQuery({ queryKey: ['escolas'], queryFn: listarEscolas });
  const turmasQuery = useQuery({
    queryKey: ['turmas', escolaId],
    queryFn: () => listarTurmasPorEscola(escolaId as string),
    enabled: !!escolaId,
  });

  const escolasFiltradas = useMemo(() => {
    const termo = buscaEscola.trim().toLowerCase();
    if (!termo) return escolasQuery.data ?? [];
    return (escolasQuery.data ?? []).filter((e) => e.nome.toLowerCase().includes(termo));
  }, [escolasQuery.data, buscaEscola]);

  const turmaSelecionada = (turmasQuery.data ?? []).find((t) => t.id === turmaId) ?? null;
  const turmaEhDeOutraPessoa =
    !!turmaSelecionada?.criado_por && turmaSelecionada.criado_por !== session?.user.id;

  const escolaSelecionada = (escolasQuery.data ?? []).find((e) => e.id === escolaId) ?? null;
  // Verificação de estudante (brief original, seção 3): e-mail
  // institucional + número do cartão. `dominio_email` fica null até
  // alguém preencher manualmente pra essa escola — sem isso, não dá
  // pra checar (documentado na migration `verificacao_estudante`), então
  // a checagem só bloqueia quando a escola tem domínio configurado.
  const emailDoUsuario = session?.user.email ?? '';
  const dominioNaoBate =
    !!escolaSelecionada?.dominio_email &&
    !emailDoUsuario.toLowerCase().endsWith(`@${escolaSelecionada.dominio_email.toLowerCase()}`);

  const pedidoQuery = useQuery({
    queryKey: ['meu-pedido-turma', turmaId, session?.user.id],
    queryFn: () => buscarMeuPedidoPendente(turmaId as string, session!.user.id),
    enabled: turmaEhDeOutraPessoa && !!turmaId && !!session,
  });

  const mutation = useMutation({
    mutationFn: concluirOnboarding,
    onSuccess: () => {
      // O RootLayout reage sozinho assim que `profile.escola_id`/`turma_id`
      // chegarem — não precisa navegar manualmente daqui.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const criarTurmaMutation = useMutation({
    mutationFn: () =>
      criarTurma({
        escolaId: escolaId as string,
        nome: novoNomeTurma.trim(),
        serieAno: novoAnoTurma.trim(),
        criadoPor: session!.user.id,
      }),
    onSuccess: (novoId) => {
      queryClient.invalidateQueries({ queryKey: ['turmas', escolaId] });
      setTurmaId(novoId);
      setCriandoTurma(false);
      setNovoNomeTurma('');
      setNovoAnoTurma('');
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const pedirEntradaMutation = useMutation({
    mutationFn: () => pedirEntradaNaTurma(turmaId as string, session!.user.id, numeroCartao.trim()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['meu-pedido-turma', turmaId, session?.user.id] }),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleConfirmar() {
    if (!session) return;
    if (!escolaId) {
      setErro('Escolha uma escola.');
      return;
    }
    if (dominioNaoBate) {
      setErro('Esse não parece ser seu e-mail institucional dessa escola.');
      return;
    }
    if (!numeroCartao.trim()) {
      setErro('Informe o número do seu cartão de estudante.');
      return;
    }
    if (!turmaId) {
      setErro('Escolha uma turma.');
      return;
    }
    setErro(null);
    mutation.mutate({
      userId: session.user.id,
      escolaId,
      turmaId,
      numeroCartao: numeroCartao.trim(),
    });
  }

  function handleCriarTurma() {
    if (dominioNaoBate) {
      setErro('Esse não parece ser seu e-mail institucional dessa escola.');
      return;
    }
    if (!numeroCartao.trim()) {
      setErro('Informe o número do seu cartão de estudante.');
      return;
    }
    if (!novoNomeTurma.trim() || !novoAnoTurma.trim()) {
      setErro('Informe o nome e o ano/série da turma nova.');
      return;
    }
    setErro(null);
    criarTurmaMutation.mutate();
  }

  function handlePedirEntrada() {
    if (dominioNaoBate) {
      setErro('Esse não parece ser seu e-mail institucional dessa escola.');
      return;
    }
    if (!numeroCartao.trim()) {
      setErro('Informe o número do seu cartão de estudante.');
      return;
    }
    setErro(null);
    pedirEntradaMutation.mutate();
  }

  return (
    <ScrollView
      contentContainerClassName="gap-4 bg-background px-6 pb-10 pt-16 dark:bg-background-dark"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <View className="mb-2 items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/40 dark:bg-primary-dark">
          <Ionicons name="location" size={30} color="#FFFFFF" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-center text-2xl font-bold text-primary dark:text-primary-dark">
            Escolha sua escola e turma
          </Text>
          <Text className="text-center text-base text-slate-600 dark:text-slate-400">
            Isso decide quais avisos e turmas você vê no app.
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={16} color="#64748B" />
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Escola</Text>
        </View>
        {escolasQuery.isLoading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : escolasQuery.isError ? (
          <Text className="text-danger dark:text-danger-dark">
            Não deu pra carregar as escolas. Tenta de novo mais tarde.
          </Text>
        ) : (
          <>
            <TextField
              label="Pesquisar escola"
              icon="search-outline"
              value={buscaEscola}
              onChangeText={setBuscaEscola}
              placeholder="Digite o nome da escola..."
            />
            {escolasFiltradas.length === 0 ? (
              <Text className="text-slate-500 dark:text-slate-400">
                Nenhuma escola encontrada com esse nome.
              </Text>
            ) : (
              <View className="gap-2">
                {escolasFiltradas.slice(0, 30).map((escola) => (
                  <ItemSelecionavel
                    key={escola.id}
                    label={escola.nome}
                    icone="business-outline"
                    selecionado={escolaId === escola.id}
                    onPress={() => {
                      setEscolaId(escola.id);
                      setTurmaId(null);
                      setErro(null);
                    }}
                  />
                ))}
                {escolasFiltradas.length > 30 ? (
                  <Text className="text-xs text-slate-400 dark:text-slate-500">
                    Mostrando as 30 primeiras — refine a pesquisa pra ver outras.
                  </Text>
                ) : null}
              </View>
            )}
          </>
        )}
      </View>

      {escolaId && dominioNaoBate ? (
        <View className="flex-row items-start gap-2 rounded-2xl bg-danger/10 p-3 dark:bg-danger-dark/10">
          <Ionicons name="shield-outline" size={18} color="#DC2626" />
          <Text className="flex-1 text-sm text-danger dark:text-danger-dark">
            Essa escola exige e-mail institucional (@{escolaSelecionada?.dominio_email}). O seu
            e-mail cadastrado ({emailDoUsuario}) não é desse domínio — refaça o cadastro com o
            e-mail da escola, ou fale com a coordenação.
          </Text>
        </View>
      ) : null}

      {escolaId && !dominioNaoBate ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="card-outline" size={16} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Verificação de estudante
            </Text>
          </View>
          <TextField
            label="Número do cartão de estudante"
            icon="card-outline"
            value={numeroCartao}
            onChangeText={setNumeroCartao}
            placeholder="ex.: 12345"
          />
        </View>
      ) : null}

      {escolaId && !dominioNaoBate ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people-outline" size={16} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Turma</Text>
          </View>
          {turmasQuery.isLoading ? (
            <ActivityIndicator color="#4F46E5" />
          ) : turmasQuery.isError ? (
            <Text className="text-danger dark:text-danger-dark">
              Não deu pra carregar as turmas. Tenta de novo mais tarde.
            </Text>
          ) : (
            <View className="gap-2">
              {(turmasQuery.data ?? []).length === 0 ? (
                <Text className="text-slate-500 dark:text-slate-400">
                  Essa escola ainda não tem turma cadastrada — crie a primeira abaixo.
                </Text>
              ) : (
                (turmasQuery.data ?? []).map((turma) => (
                  <ItemSelecionavel
                    key={turma.id}
                    label={`${turma.serie_ano} · ${turma.nome}`}
                    icone={turma.criado_por ? 'lock-closed-outline' : undefined}
                    selecionado={turmaId === turma.id}
                    onPress={() => {
                      setTurmaId(turma.id);
                      setErro(null);
                    }}
                  />
                ))
              )}

              {criandoTurma ? (
                <View className="gap-2 rounded-2xl border border-primary/30 p-3 dark:border-primary-dark/30">
                  <TextField
                    label="Nome da turma"
                    value={novoNomeTurma}
                    onChangeText={setNovoNomeTurma}
                    placeholder="ex.: Turma B"
                  />
                  <TextField
                    label="Ano/série"
                    value={novoAnoTurma}
                    onChangeText={setNovoAnoTurma}
                    placeholder="ex.: 10º ano"
                  />
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label="Cancelar"
                        variant="secondary"
                        onPress={() => setCriandoTurma(false)}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Criar"
                        icon="add"
                        onPress={handleCriarTurma}
                        loading={criarTurmaMutation.isPending}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <Button
                  label="Criar turma nova"
                  icon="add-circle-outline"
                  variant="secondary"
                  onPress={() => setCriandoTurma(true)}
                />
              )}
            </View>
          )}
        </View>
      ) : null}

      {turmaEhDeOutraPessoa ? (
        pedidoQuery.data ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-accent/10 p-3 dark:bg-accent-dark/10">
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
            <Text className="flex-1 text-sm text-accent dark:text-accent-dark">
              Pedido enviado — aguardando o dono da turma aprovar.
            </Text>
            <Pressable
              onPress={() =>
                queryClient.invalidateQueries({
                  queryKey: ['meu-pedido-turma', turmaId, session?.user.id],
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Verificar de novo"
            >
              <Ionicons name="refresh" size={18} color="#F59E0B" />
            </Pressable>
          </View>
        ) : (
          <View className="gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400">
                Essa turma foi criada por outro usuário — só o dono dela aprova quem entra.
              </Text>
            </View>
            <Button
              label="Pedir entrada"
              icon="paper-plane-outline"
              onPress={handlePedirEntrada}
              loading={pedirEntradaMutation.isPending}
            />
          </View>
        )
      ) : null}

      {erro ? (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
        </View>
      ) : null}

      {!turmaEhDeOutraPessoa ? (
        <Button
          label="Confirmar"
          icon="checkmark-circle-outline"
          onPress={handleConfirmar}
          loading={mutation.isPending}
        />
      ) : null}
    </ScrollView>
  );
}
