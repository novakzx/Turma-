import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { obterUrlAssinada } from '@/features/feed/api';
import type { PostComContadores } from '@/features/feed/api';
import { ICONE_TIPO_POST } from '@/features/feed/types';

function CelulaGrid({ post }: { post: PostComContadores }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['url-assinada', post.midia_url],
    queryFn: () => obterUrlAssinada(post.midia_url as string),
    enabled: !!post.midia_url,
    staleTime: 50 * 60 * 1000,
  });

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Publicação de ${post.tipo}`}
      className="aspect-square w-1/3 p-0.5"
    >
      {post.midia_url ? (
        isLoading || !url ? (
          <View className="flex-1 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700">
            <ActivityIndicator size="small" color="#4F46E5" />
          </View>
        ) : (
          <Image source={{ uri: url }} className="flex-1 rounded-md" resizeMode="cover" />
        )
      ) : (
        <View className="flex-1 items-center justify-center gap-1 rounded-md bg-slate-100 p-2 dark:bg-slate-800">
          <Ionicons name={ICONE_TIPO_POST[post.tipo]} size={22} color="#94A3B8" />
          {post.conteudo ? (
            <Text
              numberOfLines={2}
              className="text-center text-[10px] text-slate-500 dark:text-slate-400"
            >
              {post.conteudo}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/** Grid 3 colunas estilo Instagram — post com foto mostra a miniatura
 * (URL assinada, mesmo bucket privado do feed); post sem foto (texto,
 * evento, lembrete) mostra um ícone + trecho do texto, nunca uma
 * célula em branco. */
export function GridPosts({ posts }: { posts: PostComContadores[] }) {
  if (posts.length === 0) return null;

  return (
    <View className="-mx-0.5 flex-row flex-wrap">
      {posts.map((post) => (
        <CelulaGrid key={post.id} post={post} />
      ))}
    </View>
  );
}
