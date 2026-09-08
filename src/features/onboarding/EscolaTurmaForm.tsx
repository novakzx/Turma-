import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  atualizarAnosReprovados,
  buscarMeuPedidoPendente,
  concluirOnboarding,
  criarTurma,
  listarEscolas,
  listarTurmasPorEscola,
  pedirEntradaNaTurma,
} from '@/features/onboarding/api';
import { idadeBateComSerie } from '@/features/onboarding/idadeEscolar';

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
      className={`min-h-11 flex-row items-center gap-2 rounded-lg border px-4 py-3 ${
        selecionado ? 'border-primary bg-primary/10 dark:border-primary-dark' : 'border-slate-700'
      }`}
    >
      {icone ? (
        <Ionicons name={icone} size={16} color={selecionado ? '#8B5CF6' : '#94A3B8'} />
      ) : null}
      <Text className="flex-1 text-base text-slate-100">{label}</Text>
      {selecionado ? <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" /> : null}
    </Pressable>
  );
}

/**
 * Escolha de escola + turma, com verificação de estudante (e-mail
 * institucional + cartão) — corpo original do onboarding (Fase 9),
 * extraído aqui pra ser reusado também em "trocar de turma" (Fase 10,
 * pedido do usuário: "permitir editar a turma na tela de editar
 * perfil"). `concluirOnboarding` é a mesma chamada nos dois casos —
 * ela só faz um `update` em `profiles`, então serve tanto pra primeira
 * escolha quanto pra trocar depois.
 */
export function EscolaTurmaForm({
  escolaIdInicial = null,
  turmaIdInicial = null,
  labelBotaoConfirmar = 'Confirmar',
  onConcluido,
}: {
  escolaIdInicial?: string | null;
  turmaIdInicial?: string | null;
  labelBotaoConfirmar?: string;
  onConcluido: () => void;
}) {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [escolaId, setEscolaId] = useState<string | null>(escolaIdInicial);
  const [turmaId, setTurmaId] = useState<string | null>(turmaIdInicial);
  const [criandoTurma, setCriandoTurma] = useState(false);
  const [novoNomeTurma, setNovoNomeTurma] = useState('');
  const [novoAnoTurma, setNovoAnoTurma] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [reprovou, setReprovou] = useState<boolean | null>(null);
  const [anosReprovados, setAnosReprovados] = useState<Set<number>>(new Set());
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

  // Pedido do usuário: se a idade do cadastro não bater com o ano
  // letivo escolhido, perguntar se o aluno repetiu de ano (e quais
  // anos) antes de deixar continuar. Vale tanto pra turma já existente
  // quanto pro ano/série digitado ao criar uma turma nova.
  const serieAnoParaChecar =
    turmaSelecionada?.serie_ano ?? (criandoTurma ? novoAnoTurma.trim() : '');
  const precisaPerguntarRepeticao =
    !!profile?.idade &&
    !!serieAnoParaChecar &&
    !idadeBateComSerie(profile.idade, serieAnoParaChecar);

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
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      onConcluido();
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

  const anosReprovadosMutation = useMutation({
    mutationFn: (anos: number[]) => atualizarAnosReprovados(session!.user.id, anos),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  /** Validações comuns aos três fluxos (turma existente, criar turma,
   * pedir entrada) — devolve `false` (com `setErro` já chamado) quando
   * falta algo, incluindo a pergunta de repetência quando a idade não
   * bate com a série. */
  function validarERegistrarRepeticao(): boolean {
    if (dominioNaoBate) {
      setErro('Esse não parece ser seu e-mail institucional dessa escola.');
      return false;
    }
    if (!numeroCartao.trim()) {
      setErro('Informe o número do seu cartão de estudante.');
      return false;
    }
    if (precisaPerguntarRepeticao) {
      if (reprovou === null) {
        setErro('Sua idade não bate com esse ano letivo — responda se você repetiu de ano.');
        return false;
      }
      if (reprovou && anosReprovados.size === 0) {
        setErro('Selecione pelo menos um ano que você reprovou.');
        return false;
      }
      anosReprovadosMutation.mutate(reprovou ? Array.from(anosReprovados) : []);
    }
    setErro(null);
    return true;
  }

  function handleConfirmar() {
    if (!session) return;
    if (!escolaId) {
      setErro('Escolha uma escola.');
      return;
    }
    if (!turmaId) {
      setErro('Escolha uma turma.');
      return;
    }
    if (!validarERegistrarRepeticao()) return;
    mutation.mutate({
      userId: session.user.id,
      escolaId,
      turmaId,
      numeroCartao: numeroCartao.trim(),
    });
  }

  function handleCriarTurma() {
    if (!novoNomeTurma.trim() || !novoAnoTurma.trim()) {
      setErro('Informe o nome e o ano/série da turma nova.');
      return;
    }
    if (!validarERegistrarRepeticao()) return;
    criarTurmaMutation.mutate();
  }

  function handlePedirEntrada() {
    if (!validarERegistrarRepeticao()) return;
    pedirEntradaMutation.mutate();
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={16} color="#64748B" />
          <Text className="text-sm font-medium text-slate-300">Escola</Text>
        </View>
        {escolasQuery.isLoading ? (
          <ActivityIndicator color="#8B5CF6" />
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
              <Text className="text-slate-400">Nenhuma escola encontrada com esse nome.</Text>
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
                  <Text className="text-xs text-slate-500">
                    Mostrando as 30 primeiras — refine a pesquisa pra ver outras.
                  </Text>
                ) : null}
              </View>
            )}
          </>
        )}
      </View>

      {escolaId && dominioNaoBate ? (
        <View className="flex-row items-start gap-2 rounded-lg bg-danger/10 p-3 dark:bg-danger-dark/10">
          <Ionicons name="shield-outline" size={18} color="#F87171" />
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
            <Text className="text-sm font-medium text-slate-300">Verificação de estudante</Text>
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
            <Text className="text-sm font-medium text-slate-300">Turma</Text>
          </View>
          {turmasQuery.isLoading ? (
            <ActivityIndicator color="#8B5CF6" />
          ) : turmasQuery.isError ? (
            <Text className="text-danger dark:text-danger-dark">
              Não deu pra carregar as turmas. Tenta de novo mais tarde.
            </Text>
          ) : (
            <View className="gap-2">
              {(turmasQuery.data ?? []).length === 0 ? (
                <Text className="text-slate-400">
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
                <View className="gap-2 rounded-lg border border-primary/30 p-3 dark:border-primary-dark/30">
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

      {precisaPerguntarRepeticao ? (
        <View className="gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3 dark:border-accent-dark/30 dark:bg-accent-dark/10">
          <View className="flex-row items-start gap-2">
            <Ionicons name="help-circle-outline" size={18} color="#2DD4BF" />
            <Text className="flex-1 text-sm text-slate-300">
              A idade que você informou no cadastro não bate com o {serieAnoParaChecar} — você
              repetiu de ano?
            </Text>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Não repeti"
                variant={reprovou === false ? 'primary' : 'secondary'}
                onPress={() => {
                  setReprovou(false);
                  setAnosReprovados(new Set());
                  setErro(null);
                }}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Sim, repeti"
                variant={reprovou === true ? 'primary' : 'secondary'}
                onPress={() => {
                  setReprovou(true);
                  setErro(null);
                }}
              />
            </View>
          </View>

          {reprovou ? (
            <View className="gap-2">
              <Text className="text-xs font-medium text-slate-400">Quais anos você reprovou?</Text>
              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((ano) => {
                  const selecionado = anosReprovados.has(ano);
                  return (
                    <Pressable
                      key={ano}
                      onPress={() => {
                        setAnosReprovados((atual) => {
                          const novo = new Set(atual);
                          if (novo.has(ano)) novo.delete(ano);
                          else novo.add(ano);
                          return novo;
                        });
                        setErro(null);
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selecionado }}
                      className={`min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-2 ${
                        selecionado
                          ? 'border-primary bg-primary/10 dark:border-primary-dark'
                          : 'border-slate-700'
                      }`}
                    >
                      <Text className="text-sm text-slate-200">{ano}º</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {turmaEhDeOutraPessoa ? (
        pedidoQuery.data ? (
          <View className="flex-row items-center gap-2 rounded-lg bg-accent/10 p-3 dark:bg-accent-dark/10">
            <Ionicons name="time-outline" size={18} color="#2DD4BF" />
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
              <Ionicons name="refresh" size={18} color="#2DD4BF" />
            </Pressable>
          </View>
        ) : (
          <View className="gap-2 rounded-lg border border-slate-700 p-3">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              <Text className="flex-1 text-xs text-slate-400">
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
          <Ionicons name="alert-circle" size={14} color="#F87171" />
          <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
        </View>
      ) : null}

      {!turmaEhDeOutraPessoa ? (
        <Button
          label={labelBotaoConfirmar}
          icon="checkmark-circle-outline"
          onPress={handleConfirmar}
          loading={mutation.isPending}
        />
      ) : null}
    </View>
  );
}
