import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarApresentacao,
  gerarApresentacao,
  listarMinhasApresentacoes,
} from '@/features/apresentacoes/api';
import type { Apresentacao } from '@/features/apresentacoes/types';
import { listarMateriasDaTurma } from '@/features/notas/api';

/** `window.confirm` no web, `Alert.alert` nativo — mesmo padrão de
 * `flashcards.tsx`/`perfil.tsx`. */
function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Apagar apresentação', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: aoConfirmar },
  ]);
}

// A linha (navega pro carrossel) e o botão de apagar são elementos
// IRMÃOS, nunca um `Pressable` aninhado dentro do outro — achado ao vivo
// no bug da página de notificações (`LinhaPerfil`): no web, `Pressable`
// vira `<button>`, e um `<button>` dentro de outro `<button>` quebra a
// hidratação.
function CartaoApresentacao({
  apresentacao,
  onApagar,
  apagando,
}: {
  apresentacao: Apresentacao;
  onApagar: () => void;
  apagando: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
      <Pressable
        onPress={() => router.push(`/apresentacao/${apresentacao.id}`)}
        accessibilityRole="button"
        className="min-h-11 flex-1 flex-row items-center gap-3"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="easel-outline" size={18} color="#0095F6" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={2}>
            {apresentacao.topico}
          </Text>
          <Text className="text-xs text-slate-500">
            {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(
              new Date(apresentacao.criado_em),
            )}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => confirmar(`Apagar a apresentação "${apresentacao.topico}"?`, onApagar)}
        disabled={apagando}
        accessibilityRole="button"
        accessibilityLabel="Apagar apresentação"
        className="min-h-11 min-w-11 items-center justify-center"
      >
        {apagando ? (
          <ActivityIndicator size="small" color="#F87171" />
        ) : (
          <Ionicons name="trash-outline" size={16} color="#F87171" />
        )}
      </Pressable>
    </View>
  );
}

export default function Apresentacoes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [topico, setTopico] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const materiaAtual = useMemo(
    () => materiaId ?? materiasQuery.data?.[0]?.id ?? null,
    [materiaId, materiasQuery.data],
  );

  const apresentacoesQuery = useQuery({
    queryKey: ['apresentacoes', profile?.id],
    queryFn: () => listarMinhasApresentacoes(profile!.id),
    enabled: !!profile,
  });

  const gerarMutation = useMutation({
    mutationFn: () => gerarApresentacao({ materiaId: materiaAtual as string, topico: topico.trim() }),
    onSuccess: (data) => {
      setTopico('');
      setErro(null);
      queryClient.invalidateQueries({ queryKey: ['apresentacoes', profile?.id] });
      router.push(`/apresentacao/${data.id}`);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const apagarMutation = useMutation({
    mutationFn: apagarApresentacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apresentacoes', profile?.id] }),
  });

  function handleGerar() {
    if (!materiaAtual) return;
    if (!topico.trim()) {
      setErro('Escreve o assunto da apresentação antes de gerar.');
      return;
    }
    setErro(null);
    gerarMutation.mutate();
  }

  if (materiasQuery.isLoading) return <LoadingState />;
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
    <ScrollView className="flex-1 bg-background dark:bg-background-dark" contentContainerClassName="gap-4 p-4 pb-10">
      <View className="gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
        <Text className="text-sm font-semibold text-slate-900">Gerar apresentação com IA</Text>
        <View className="flex-row flex-wrap gap-2">
          {(materiasQuery.data ?? []).map((materia) => (
            <Pressable
              key={materia.id}
              onPress={() => setMateriaId(materia.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: materiaAtual === materia.id }}
              className={`min-h-11 items-center justify-center rounded-md border px-4 ${
                materiaAtual === materia.id
                  ? 'border-primary bg-primary/10 dark:border-primary-dark'
                  : 'border-slate-200'
              }`}
            >
              <Text className="text-sm text-slate-900">{materia.nome}</Text>
            </Pressable>
          ))}
        </View>
        <TextField
          label="Assunto"
          value={topico}
          onChangeText={setTopico}
          placeholder="Ex.: Segunda Guerra Mundial"
          editable={!gerarMutation.isPending}
        />
        {gerarMutation.isPending ? (
          <View className="flex-row items-center gap-1.5">
            <ActivityIndicator size="small" color="#0095F6" />
            <Text className="flex-1 text-sm text-slate-500">
              A IA está a criar os slides e as imagens... pode demorar até um minuto.
            </Text>
          </View>
        ) : erro ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#F87171" />
            <Text className="flex-1 text-sm text-danger dark:text-danger-dark">{erro}</Text>
          </View>
        ) : null}
        <Button
          label="Gerar apresentação"
          icon="sparkles"
          onPress={handleGerar}
          loading={gerarMutation.isPending}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-slate-900">Minhas apresentações</Text>
        {apresentacoesQuery.isLoading ? (
          <LoadingState />
        ) : (apresentacoesQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="easel-outline"
            titulo="Nenhuma apresentação ainda"
            descricao="Escolhe uma matéria e um assunto acima pra gerar a primeira."
          />
        ) : (
          (apresentacoesQuery.data ?? []).map((apresentacao) => (
            <CartaoApresentacao
              key={apresentacao.id}
              apresentacao={apresentacao}
              onApagar={() => apagarMutation.mutate(apresentacao.id)}
              apagando={apagarMutation.isPending && apagarMutation.variables === apresentacao.id}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
