import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarMateria,
  criarMateria,
  listarMateriasDaTurma,
  renomearMateria,
} from '@/features/notas/api';
import type { Materia } from '@/features/notas/types';

/** `window.confirm` no web, `Alert.alert` nativo — mesmo padrão de
 * `post/[id].tsx` (`Alert.alert` não tem UI no navegador). */
function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Confirmar', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: aoConfirmar },
  ]);
}

function LinhaMateria({
  materia,
  podeEditar,
  onRenomear,
  onApagar,
  salvando,
}: {
  materia: Materia;
  podeEditar: boolean;
  onRenomear: (nome: string) => void;
  onApagar: () => void;
  salvando: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(materia.nome);

  function handleSalvar() {
    if (!nome.trim()) return;
    onRenomear(nome.trim());
    setEditando(false);
  }

  if (editando) {
    return (
      <View className="gap-2 rounded-lg border border-primary/30 bg-surface p-3 dark:border-primary-dark/30 dark:bg-surface-dark">
        <TextField label="Nome da matéria" value={nome} onChangeText={setNome} autoFocus />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Cancelar" variant="secondary" onPress={() => setEditando(false)} />
          </View>
          <View className="flex-1">
            <Button label="Salvar" icon="checkmark" onPress={handleSalvar} loading={salvando} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-slate-800 bg-surface p-3 dark:bg-surface-dark">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
        <Ionicons name="book-outline" size={18} color="#8B5CF6" />
      </View>
      <Text className="flex-1 text-base text-slate-100">{materia.nome}</Text>
      {podeEditar ? (
        <>
          <Pressable
            onPress={() => setEditando(true)}
            accessibilityRole="button"
            accessibilityLabel={`Renomear ${materia.nome}`}
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <Ionicons name="create-outline" size={18} color="#8B5CF6" />
          </Pressable>
          <Pressable
            onPress={onApagar}
            accessibilityRole="button"
            accessibilityLabel={`Apagar ${materia.nome}`}
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export default function GerenciarMaterias() {
  const { profile } = useAuth();
  // Fase 8 restringia isso a staff; pedido do usuário abriu "adicionar"
  // pra qualquer aluno da turma (RLS: `materias_insert_aluno`) — renomear
  // e apagar continuam staff-only (apagar é destrutivo pra turma inteira,
  // ver comentário na migration `aluno_pode_adicionar_materia`).
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const materiasQuery = useQuery({
    queryKey: ['materias', profile?.turma_id],
    queryFn: () => listarMateriasDaTurma(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['materias', profile?.turma_id] });
  }

  const criarMutation = useMutation({
    mutationFn: () => criarMateria({ turmaId: profile!.turma_id as string, nome: novoNome.trim() }),
    onSuccess: () => {
      setNovoNome('');
      setCriando(false);
      invalidar();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const renomearMutation = useMutation({
    mutationFn: (params: { id: string; nome: string }) => renomearMateria(params.id, params.nome),
    onSuccess: invalidar,
  });

  const apagarMutation = useMutation({
    mutationFn: apagarMateria,
    onSuccess: invalidar,
  });

  function handleCriar() {
    if (!novoNome.trim()) {
      setErro('Dá um nome pra matéria.');
      return;
    }
    setErro(null);
    criarMutation.mutate();
  }

  function handleApagar(materia: Materia) {
    confirmar(
      `Apagar "${materia.nome}"? Isso apaga junto todas as notas lançadas, o histórico do chat com IA e a sala de chat dessa matéria — não dá pra desfazer.`,
      () => apagarMutation.mutate(materia.id),
    );
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

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-3 p-4 pb-10"
    >
      {(materiasQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="book-outline"
          titulo="Nenhuma matéria ainda"
          descricao="Crie a primeira matéria da turma abaixo."
        />
      ) : (
        (materiasQuery.data ?? []).map((materia) => (
          <LinhaMateria
            key={materia.id}
            materia={materia}
            podeEditar={ehStaff}
            salvando={renomearMutation.isPending && renomearMutation.variables?.id === materia.id}
            onRenomear={(nome) => renomearMutation.mutate({ id: materia.id, nome })}
            onApagar={() => handleApagar(materia)}
          />
        ))
      )}

      <View className="border-t border-slate-800 pt-4">
        {criando ? (
          <View className="gap-2 rounded-lg border border-slate-800 bg-surface p-3 dark:bg-surface-dark">
            <TextField
              label="Nome da matéria"
              icon="book-outline"
              value={novoNome}
              onChangeText={setNovoNome}
              error={erro ?? undefined}
              placeholder="ex.: Geografia"
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => {
                    setCriando(false);
                    setErro(null);
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Criar"
                  icon="add"
                  onPress={handleCriar}
                  loading={criarMutation.isPending}
                />
              </View>
            </View>
          </View>
        ) : (
          <Button
            label="Nova matéria"
            icon="add-circle-outline"
            variant="secondary"
            onPress={() => setCriando(true)}
          />
        )}
      </View>
    </ScrollView>
  );
}
