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
  entrarTurmaPorAno,
  listarEscolas,
} from '@/features/onboarding/api';
import { idadeBateComSerie } from '@/features/onboarding/idadeEscolar';

// Mesmo formato usado no seed (`"Nº ano"`, ver migration inicial) —
// 5º ao 12º porque é o intervalo que as escolas cadastradas hoje
// realmente oferecem (2º/3º ciclo + secundário).
const ANOS_ESCOLARES = Array.from({ length: 8 }, (_, i) => `${i + 5}º ano`);

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
        selecionado ? 'border-primary bg-primary/10 dark:border-primary-dark' : 'border-slate-200'
      }`}
    >
      {icone ? (
        <Ionicons name={icone} size={16} color={selecionado ? '#0095F6' : '#969696'} />
      ) : null}
      <Text className="flex-1 text-base text-slate-900">{label}</Text>
      {selecionado ? <Ionicons name="checkmark-circle" size={20} color="#0095F6" /> : null}
    </Pressable>
  );
}

/**
 * Escolha de escola + ano escolar, com verificação de estudante
 * (e-mail institucional + cartão) — corpo original do onboarding (Fase
 * 9), reusado também em "trocar de turma" (Fase 10). Turma deixou de
 * ser escolhida manualmente numa lista (pedido do usuário: "tira as
 * turmas deixe so o ano escolar mesmo") — o app resolve (ou cria)
 * sozinho a turma da combinação escola+ano via RPC
 * `entrar_turma_por_ano` (ver `features/onboarding/api.ts`), sem dono
 * nem pedido de entrada.
 */
export function EscolaTurmaForm({
  escolaIdInicial = null,
  serieAnoInicial = null,
  labelBotaoConfirmar = 'Confirmar',
  onConcluido,
}: {
  escolaIdInicial?: string | null;
  serieAnoInicial?: string | null;
  labelBotaoConfirmar?: string;
  onConcluido: () => void;
}) {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [escolaId, setEscolaId] = useState<string | null>(escolaIdInicial);
  const [serieAno, setSerieAno] = useState<string | null>(serieAnoInicial);
  const [numeroCartao, setNumeroCartao] = useState('');
  const [reprovou, setReprovou] = useState<boolean | null>(null);
  const [anosReprovados, setAnosReprovados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const escolasQuery = useQuery({ queryKey: ['escolas'], queryFn: listarEscolas });

  const escolasFiltradas = useMemo(() => {
    const termo = buscaEscola.trim().toLowerCase();
    if (!termo) return escolasQuery.data ?? [];
    return (escolasQuery.data ?? []).filter((e) => e.nome.toLowerCase().includes(termo));
  }, [escolasQuery.data, buscaEscola]);

  // Pedido do usuário: se a idade do cadastro não bater com o ano
  // letivo escolhido, perguntar se o aluno repetiu de ano (e quais
  // anos) antes de deixar continuar.
  const precisaPerguntarRepeticao =
    !!profile?.idade && !!serieAno && !idadeBateComSerie(profile.idade, serieAno);

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

  const mutation = useMutation({
    mutationFn: entrarTurmaPorAno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      onConcluido();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const anosReprovadosMutation = useMutation({
    mutationFn: (anos: number[]) => atualizarAnosReprovados(session!.user.id, anos),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleConfirmar() {
    if (!session) return;
    if (!escolaId) {
      setErro('Escolha uma escola.');
      return;
    }
    if (!serieAno) {
      setErro('Escolha o ano escolar.');
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
    if (precisaPerguntarRepeticao) {
      if (reprovou === null) {
        setErro('Sua idade não bate com esse ano letivo — responda se você repetiu de ano.');
        return;
      }
      if (reprovou && anosReprovados.size === 0) {
        setErro('Selecione pelo menos um ano que você reprovou.');
        return;
      }
      anosReprovadosMutation.mutate(reprovou ? Array.from(anosReprovados) : []);
    }
    setErro(null);
    mutation.mutate({ escolaId, serieAno, numeroCartao: numeroCartao.trim() });
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={16} color="#969696" />
          <Text className="text-sm font-medium text-slate-700">Escola</Text>
        </View>
        {escolasQuery.isLoading ? (
          <ActivityIndicator color="#0095F6" />
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
              <Text className="text-slate-500">Nenhuma escola encontrada com esse nome.</Text>
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
            <Ionicons name="school-outline" size={16} color="#969696" />
            <Text className="text-sm font-medium text-slate-700">Ano escolar</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {ANOS_ESCOLARES.map((ano) => (
              <Pressable
                key={ano}
                onPress={() => {
                  setSerieAno(ano);
                  setErro(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: serieAno === ano }}
                className={`min-h-11 items-center justify-center rounded-full border px-4 ${
                  serieAno === ano
                    ? 'border-primary bg-primary/10 dark:border-primary-dark'
                    : 'border-slate-200'
                }`}
              >
                <Text className="text-sm font-medium text-slate-800">{ano}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {escolaId && !dominioNaoBate ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="card-outline" size={16} color="#969696" />
            <Text className="text-sm font-medium text-slate-700">Verificação de estudante</Text>
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

      {precisaPerguntarRepeticao ? (
        <View className="gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3 dark:border-accent-dark/30 dark:bg-accent-dark/10">
          <View className="flex-row items-start gap-2">
            <Ionicons name="help-circle-outline" size={18} color="#0095F6" />
            <Text className="flex-1 text-sm text-slate-700">
              A idade que você informou no cadastro não bate com o {serieAno} — você repetiu de
              ano?
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
              <Text className="text-xs font-medium text-slate-500">Quais anos você reprovou?</Text>
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
                          : 'border-slate-200'
                      }`}
                    >
                      <Text className="text-sm text-slate-800">{ano}º</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {erro ? (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={14} color="#F87171" />
          <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
        </View>
      ) : null}

      <Button
        label={labelBotaoConfirmar}
        icon="checkmark-circle-outline"
        onPress={handleConfirmar}
        loading={mutation.isPending}
      />
    </View>
  );
}
