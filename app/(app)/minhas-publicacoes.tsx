import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { curtir, descurtir, listarMeusLikes, listarPostsDoAutor } from '@/features/feed/api';
import { CartaoPost } from '@/features/feed/CartaoPost';

/** "Ver as publicações" no perfil — mesmo card do feed da turma, só que
 * filtrado por autor em vez de turma (ver `listarPostsDoAutor`). */
export default function MinhasPublicacoes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['meus-posts', profile?.id],
    queryFn: () => listarPostsDoAutor(profile?.id as string),
    enabled: !!profile?.id,
  });

  const postIds = useMemo(() => (postsQuery.data ?? []).map((p) => p.id), [postsQuery.data]);
  const likesQuery = useQuery({
    queryKey: ['meus-likes', postIds],
    queryFn: () => listarMeusLikes(postIds, profile!.id),
    enabled: postIds.length > 0 && !!profile,
  });

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ['meus-posts', profile?.id] });
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
    return <EmptyState titulo="Não deu pra carregar" onTentarNovo={() => postsQuery.refetch()} />;
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {(postsQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="newspaper-outline"
          titulo="Você ainda não postou nada"
          descricao="Os posts que você criar no feed da turma aparecem aqui."
        />
      ) : (
        <FlatList
          data={postsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-4"
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
    </View>
  );
}
