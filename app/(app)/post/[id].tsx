import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  apagarComentario,
  apagarPost,
  buscarPost,
  criarComentario,
  listarComentarios,
  type ComentarioComAutor,
} from '@/features/feed/api';
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import { ImagemPost } from '@/features/feed/ImagemPost';
import { ROTULO_TIPO_POST } from '@/features/feed/types';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

function formatarData(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatarDataEvento(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`));
}

/** `window.confirm` no web, `Alert.alert` nativo — evita depender de
 * `Alert.alert` no navegador, onde não existe UI nenhuma pra ele. */
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

function LinhaComentario({
  comentario,
  podeApagar,
  onApagar,
}: {
  comentario: ComentarioComAutor;
  podeApagar: boolean;
  onApagar: () => void;
}) {
  return (
    <View className="gap-1 border-b border-slate-100 py-3 dark:border-slate-800">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {comentario.profiles?.nome ?? 'Aluno'}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(comentario.criado_em)}
        </Text>
      </View>
      <Text className="text-sm text-slate-700 dark:text-slate-300">{comentario.conteudo}</Text>
      <View className="flex-row items-center gap-3">
        <BotaoDenunciar tipoConteudo="comentario" conteudoId={comentario.id} />
        {podeApagar ? (
          <Pressable
            onPress={onApagar}
            accessibilityRole="button"
            accessibilityLabel="Apagar comentário"
            className="min-h-11 min-w-11 flex-row items-center gap-1 px-2"
          >
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
            <Text className="text-xs text-danger dark:text-danger-dark">Apagar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function DetalhePost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [novoComentario, setNovoComentario] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => buscarPost(id as string),
    enabled: !!id,
  });

  const comentariosQuery = useQuery({
    queryKey: ['comentarios', id],
    queryFn: () => listarComentarios(id as string),
    enabled: !!id,
  });

  function invalidarComentarios() {
    queryClient.invalidateQueries({ queryKey: ['comentarios', id] });
    queryClient.invalidateQueries({ queryKey: ['post', id] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }

  const comentarMutation = useMutation({
    mutationFn: () =>
      criarComentario({
        postId: id as string,
        autorId: profile!.id,
        conteudo: novoComentario.trim(),
      }),
    onSuccess: () => {
      setNovoComentario('');
      invalidarComentarios();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const apagarComentarioMutation = useMutation({
    mutationFn: apagarComentario,
    onSuccess: invalidarComentarios,
  });

  const apagarPostMutation = useMutation({
    mutationFn: () => apagarPost(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.back();
    },
  });

  if (postQuery.isLoading) return <LoadingState />;
  if (postQuery.isError || !postQuery.data) {
    return (
      <EmptyState
        titulo="Não deu pra carregar o post"
        descricao="Verifica a tua ligação e tenta de novo."
        onTentarNovo={() => postQuery.refetch()}
      />
    );
  }

  const post = postQuery.data;
  const ehAutor = profile?.id === post.autor_id;
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';

  function handleEnviarComentario() {
    if (!novoComentario.trim()) {
      setErro('Escreve alguma coisa antes de enviar.');
      return;
    }
    setErro(null);
    comentarMutation.mutate();
  }

  return (
    <FlatList
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-3 px-6 pb-10 pt-6"
      ListHeaderComponent={
        <View className="gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() =>
                post.profiles?.id === profile?.id
                  ? router.push('/perfil')
                  : post.profiles?.id && router.push(`/perfil/${post.profiles.id}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${post.profiles?.nome ?? 'Aluno'}`}
            >
              <FotoPerfil
                caminho={post.profiles?.foto_url ?? null}
                nome={post.profiles?.nome ?? '?'}
                tamanho={40}
              />
            </Pressable>
            <View className="flex-1 gap-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {post.profiles?.nome ?? 'Aluno'}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {formatarData(post.criado_em)} · {ROTULO_TIPO_POST[post.tipo]}
              </Text>
            </View>
            {ehAutor || ehStaff ? (
              <Pressable
                onPress={() =>
                  confirmar('Apagar este post? Essa ação não pode ser desfeita.', () =>
                    apagarPostMutation.mutate(),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Apagar post"
                className="min-h-11 min-w-11 items-center justify-center px-2"
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            ) : null}
          </View>

          {post.tipo === 'evento' && post.data_evento ? (
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 dark:bg-primary-dark/10">
              <Ionicons name="calendar" size={14} color="#4F46E5" />
              <Text className="text-sm font-medium text-primary dark:text-primary-dark">
                {formatarDataEvento(post.data_evento)}
              </Text>
            </View>
          ) : null}

          {post.conteudo ? (
            <Text className="text-base text-slate-800 dark:text-slate-200">{post.conteudo}</Text>
          ) : null}

          {post.tipo === 'foto' && post.midia_url ? <ImagemPost caminho={post.midia_url} /> : null}

          <BotaoDenunciar tipoConteudo="post" conteudoId={post.id} />

          <Text className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Comentários
          </Text>
        </View>
      }
      data={comentariosQuery.data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <LinhaComentario
          comentario={item}
          podeApagar={profile?.id === item.autor_id || !!ehStaff}
          onApagar={() =>
            confirmar('Apagar este comentário?', () => apagarComentarioMutation.mutate(item.id))
          }
        />
      )}
      ListEmptyComponent={
        comentariosQuery.isLoading ? (
          <LoadingState />
        ) : (
          <View className="flex-row items-center gap-1.5 py-4">
            <Ionicons name="chatbubble-outline" size={14} color="#94A3B8" />
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Ainda sem comentários. Sê o primeiro a comentar.
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        <View className="mt-4 gap-2">
          <TextField
            label="Adicionar comentário"
            icon="chatbubble-outline"
            value={novoComentario}
            onChangeText={setNovoComentario}
            error={erro ?? undefined}
            multiline
          />
          <Button
            label="Comentar"
            icon="send"
            onPress={handleEnviarComentario}
            loading={comentarMutation.isPending}
          />
        </View>
      }
    />
  );
}
