import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { apagarInscricao, listarInscricoes, type Inscricao } from '@/features/lancamento/api';
import { exportarArquivoTexto } from '@/lib/exportarArquivo';

/**
 * Painel separado (fora do login normal do app, senha simples definida
 * no segredo `ADMIN_LANCAMENTO_SENHA` da Edge Function) pra ver quem se
 * inscreveu na lista de acesso antecipado. A senha só fica em memória
 * (estado do componente) -- nunca gravada em disco/`AsyncStorage`.
 */
export default function PainelInscricoesScreen() {
  const [senha, setSenha] = useState('');
  const [senhaAtiva, setSenhaAtiva] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inscricoes-lancamento', senhaAtiva],
    queryFn: () => listarInscricoes(senhaAtiva!),
    enabled: !!senhaAtiva,
    retry: false,
  });

  const apagarMutation = useMutation({
    mutationFn: (id: string) => apagarInscricao(senhaAtiva!, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['inscricoes-lancamento', senhaAtiva] }),
  });

  function handleEntrar() {
    if (!senha) {
      setErroSenha('Informe a senha.');
      return;
    }
    setErroSenha(undefined);
    setSenhaAtiva(senha);
  }

  function handleExportarCsv(inscricoes: Inscricao[]) {
    const linhas = [
      'nome,telefone,email,criado_em',
      ...inscricoes.map(
        (i) => `"${i.nome.replace(/"/g, '""')}","${i.telefone}","${i.email}","${i.criado_em}"`,
      ),
    ];
    void exportarArquivoTexto(linhas.join('\n'), 'inscricoes-turma-mais.csv', 'text/csv');
  }

  if (!senhaAtiva || query.isError) {
    const mensagemErro = query.isError
      ? query.error instanceof Error
        ? query.error.message
        : 'Senha incorreta.'
      : erroSenha;

    return (
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="w-full max-w-sm gap-4">
          <View className="items-center gap-1">
            <Ionicons name="lock-closed" size={32} color="#8B5CF6" />
            <Text className="text-xl font-bold text-slate-900">Painel de inscrições</Text>
          </View>
          <TextField
            label="Senha"
            icon="key-outline"
            value={senha}
            onChangeText={(v) => {
              setSenha(v);
              setSenhaAtiva(null);
            }}
            error={mensagemErro}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={handleEntrar}
          />
          <Button label="Entrar" icon="log-in-outline" onPress={handleEntrar} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  const inscricoes = query.data ?? [];

  return (
    <View className="flex-1 bg-background pt-16 dark:bg-background-dark">
      <View className="flex-row items-center justify-between px-6 pb-4">
        <View>
          <Text className="text-xl font-bold text-slate-900">Inscrições</Text>
          <Text className="text-sm text-slate-500">
            {inscricoes.length} {inscricoes.length === 1 ? 'pessoa' : 'pessoas'} na lista
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Button
            label="CSV"
            icon="download-outline"
            variant="secondary"
            onPress={() => handleExportarCsv(inscricoes)}
            disabled={inscricoes.length === 0}
          />
          <Button
            label="Atualizar"
            icon="refresh"
            variant="secondary"
            onPress={() => query.refetch()}
            loading={query.isFetching}
          />
        </View>
      </View>

      {query.isPending ? (
        <LoadingState />
      ) : inscricoes.length === 0 ? (
        <EmptyState titulo="Ninguém se inscreveu ainda" icon="mail-open-outline" />
      ) : (
        <FlatList
          data={inscricoes}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 px-6 pb-8"
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-3 dark:bg-surface-dark">
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-medium text-slate-900">{item.nome}</Text>
                <Text className="text-sm text-slate-500">{item.email}</Text>
                <Text className="text-sm text-slate-500">{item.telefone}</Text>
                <Text className="text-xs text-slate-500">
                  {new Date(item.criado_em).toLocaleString('pt-BR')}
                </Text>
              </View>
              <Pressable
                onPress={() => apagarMutation.mutate(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Apagar inscrição de ${item.nome}`}
                className="min-h-11 min-w-11 items-center justify-center"
              >
                {apagarMutation.isPending && apagarMutation.variables === item.id ? (
                  <ActivityIndicator color="#F87171" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
