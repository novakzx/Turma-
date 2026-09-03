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

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { enviarMensagemChat, listarHistoricoChat } from '@/features/estudo/api';
import { ROTULO_MODO, type MensagemChatIA, type ModoChatEstudo } from '@/features/estudo/types';
import { listarMateriasDaTurma } from '@/features/notas/api';

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
      className={`min-h-11 justify-center rounded-full border px-4 ${
        selecionada
          ? 'border-primary bg-primary/10 dark:border-primary-dark'
          : 'border-slate-300 dark:border-slate-700'
      }`}
    >
      <Text className="text-sm text-slate-900 dark:text-slate-100">{nome}</Text>
    </Pressable>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: MensagemChatIA }) {
  const doAluno = mensagem.papel === 'usuario';
  return (
    <View className={`max-w-[85%] ${doAluno ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-lg px-3 py-2 ${
          doAluno
            ? 'bg-primary dark:bg-primary-dark'
            : 'border border-slate-200 bg-surface dark:border-slate-700 dark:bg-surface-dark'
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
      <View className="gap-2 border-b border-slate-200 p-3 dark:border-slate-700">
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
                className={`min-h-11 justify-center rounded-full border px-3 ${
                  modo === opcao
                    ? 'border-accent bg-accent/10 dark:border-accent-dark'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <Text className="text-xs text-slate-900 dark:text-slate-100">
                  {ROTULO_MODO[opcao]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {!materiaId ? (
        <EmptyState titulo="Escolha uma matéria" descricao="Toque num chip acima pra começar." />
      ) : historicoQuery.isLoading ? (
        <LoadingState />
      ) : historicoQuery.isError ? (
        <EmptyState
          titulo="Não deu pra carregar a conversa"
          onTentarNovo={() => historicoQuery.refetch()}
        />
      ) : (
        <FlatList
          data={historicoQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 p-4"
          ListEmptyComponent={
            <EmptyState
              titulo="Ainda não tem conversa nessa matéria"
              descricao="Escolhe o modo acima e manda sua primeira pergunta."
            />
          }
          renderItem={({ item }) => <BolhaMensagem mensagem={item} />}
        />
      )}

      {materiaId ? (
        <View className="gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
          {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                label=""
                value={texto}
                onChangeText={setTexto}
                placeholder="Escreve sua pergunta..."
                multiline
              />
            </View>
            <Pressable
              onPress={handleEnviar}
              disabled={enviarMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              className={`min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-4 dark:bg-primary-dark ${
                enviarMutation.isPending ? 'opacity-60' : ''
              }`}
            >
              {enviarMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-semibold text-white">Enviar</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
