import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { curtir, descurtir, listarMeusLikes, listarPosts } from '@/features/feed/api';
import { CartaoPost } from '@/features/feed/CartaoPost';
import { StoriesBar } from '@/features/social/StoriesBar';

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
        <>
          <StoriesBar />
          <EmptyState
            icon="newspaper-outline"
            titulo="Nenhum post na turma ainda"
            descricao="Seja o primeiro a postar algo pra galera."
          />
        </>
      ) : (
        <FlatList
          data={postsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="pb-28"
          refreshControl={
            <RefreshControl
              refreshing={postsQuery.isRefetching}
              onRefresh={() => postsQuery.refetch()}
              tintColor="#4F46E5"
            />
          }
          ListHeaderComponent={
            <>
              <StoriesBar />
              <View className="h-1" />
            </>
          }
          renderItem={({ item, index }) => (
            <View className="px-4">
              <CartaoPost
                post={item}
                index={index}
                curtido={likesQuery.data?.has(item.id) ?? false}
                onCurtir={() => curtirMutation.mutate(item.id)}
                onDescurtir={() => descurtirMutation.mutate(item.id)}
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
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
