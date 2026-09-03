import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  curtir,
  descurtir,
  listarMeusLikes,
  listarPosts,
  type PostComContadores,
} from '@/features/feed/api';
import { BotaoDenunciar } from '@/features/feed/BotaoDenunciar';
import { ImagemPost } from '@/features/feed/ImagemPost';
import { ICONE_TIPO_POST, ROTULO_TIPO_POST } from '@/features/feed/types';

function formatarData(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
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

function CartaoPost({
  post,
  curtido,
  index,
  onCurtir,
  onDescurtir,
}: {
  post: PostComContadores;
  curtido: boolean;
  index: number;
  onCurtir: () => void;
  onDescurtir: () => void;
}) {
  const totalCurtidas = post.post_curtidas[0]?.count ?? 0;
  const totalComentarios = post.post_comentarios[0]?.count ?? 0;

  return (
    <EntradaAnimada
      index={index}
      className="gap-2 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="person" size={18} color="#4F46E5" />
        </View>
        <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {post.profiles?.nome ?? 'Alguém da turma'}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(post.criado_em)}
        </Text>
      </View>

      {post.tipo !== 'texto' ? (
        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-accent/10 px-3 py-1 dark:bg-accent-dark/10">
          <Ionicons name={ICONE_TIPO_POST[post.tipo]} size={14} color="#F59E0B" />
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
            {ROTULO_TIPO_POST[post.tipo]}
            {post.tipo === 'evento' && post.data_evento
              ? ` · ${formatarDataEvento(post.data_evento)}`
              : ''}
          </Text>
        </View>
      ) : null}

      {post.conteudo ? (
        <Text className="text-base text-slate-900 dark:text-slate-100">{post.conteudo}</Text>
      ) : null}

      {post.tipo === 'foto' && post.midia_url ? <ImagemPost caminho={post.midia_url} /> : null}

      <View className="flex-row items-center gap-1 pt-1">
        <Pressable
          onPress={curtido ? onDescurtir : onCurtir}
          accessibilityRole="button"
          accessibilityLabel={curtido ? 'Descurtir' : 'Curtir'}
          className="min-h-11 flex-row items-center gap-1 rounded-full px-3 py-2 active:bg-primary/5"
        >
          <Ionicons
            name={curtido ? 'heart' : 'heart-outline'}
            size={18}
            color={curtido ? '#4F46E5' : '#94A3B8'}
          />
          <Text
            className={
              curtido ? 'text-primary dark:text-primary-dark' : 'text-slate-600 dark:text-slate-400'
            }
          >
            {totalCurtidas}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/post/${post.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Ver comentários"
          className="min-h-11 flex-row items-center gap-1 rounded-full px-3 py-2 active:bg-primary/5"
        >
          <Ionicons name="chatbubble-outline" size={17} color="#94A3B8" />
          <Text className="text-slate-600 dark:text-slate-400">{totalComentarios}</Text>
        </Pressable>
        <View className="flex-1" />
        <BotaoDenunciar tipoConteudo="post" conteudoId={post.id} />
      </View>
    </EntradaAnimada>
  );
}

export default function Feed() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['posts', profile?.turma_id],
    queryFn: () => listarPosts(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const postIds = useMemo(() => (postsQuery.data ?? []).map((p) => p.id), [postsQuery.data]);
  const likesQuery = useQuery({
    queryKey: ['meus-likes', postIds],
    queryFn: () => listarMeusLikes(postIds, profile!.id),
    enabled: postIds.length > 0 && !!profile,
  });

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ['posts', profile?.turma_id] });
    queryClient.invalidateQueries({ queryKey: ['meus-likes'] });
  }

  const curtirMutation = useMutation({
    mutationFn: (postId: string) => curtir(postId, profile!.id),
    onSuccess: invalidarTudo,
  });
  const descurtirMutation = useMutation({
    mutationFn: (postId: string) => descurtir(postId, profile!.id),
    onSuccess: invalidarTudo,
  });

  if (postsQuery.isLoading) return <LoadingState />;
  if (postsQuery.isError) {
    return (
      <EmptyState titulo="Não deu pra carregar o feed" onTentarNovo={() => postsQuery.refetch()} />
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {(postsQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="newspaper-outline"
          titulo="Nenhum post na turma ainda"
          descricao="Seja o primeiro a postar algo pra galera."
        />
      ) : (
        <FlatList
          data={postsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-4 pb-28"
          renderItem={({ item, index }) => (
            <CartaoPost
              post={item}
              index={index}
              curtido={likesQuery.data?.has(item.id) ?? false}
              onCurtir={() => curtirMutation.mutate(item.id)}
              onDescurtir={() => descurtirMutation.mutate(item.id)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/novo-post')}
        accessibilityRole="button"
        accessibilityLabel="Novo post"
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 dark:bg-primary-dark"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
