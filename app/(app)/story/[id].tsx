import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { listarStoriesDoAutor, obterUrlAssinadaStory } from '@/features/social/api';

/** Visualizador de story — id da rota é o AUTOR (não o story
 * individual), já que uma pessoa pode ter várias ativas ao mesmo
 * tempo. Toque na metade direita avança, na esquerda volta — sem
 * temporizador automático (MVP simples, documentado como limitação
 * conhecida). RLS de `stories` já decide se essa lista vem vazia ou
 * não pra quem está vendo. */
export default function StoryViewer() {
  const { id: autorId } = useLocalSearchParams<{ id: string }>();
  const [indice, setIndice] = useState(0);

  const storiesQuery = useQuery({
    queryKey: ['stories-do-autor', autorId],
    queryFn: () => listarStoriesDoAutor(autorId),
  });

  const stories = storiesQuery.data ?? [];
  const storyAtual = stories[indice];

  const urlQuery = useQuery({
    queryKey: ['url-assinada-story', storyAtual?.midia_url],
    queryFn: () => obterUrlAssinadaStory(storyAtual!.midia_url),
    enabled: !!storyAtual,
  });

  if (storiesQuery.isLoading) return <LoadingState />;
  if (storiesQuery.isError || stories.length === 0) {
    return (
      <EmptyState
        icon="images-outline"
        titulo="Sem stories pra ver"
        descricao="Essa story já pode ter expirado."
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <View className="flex-row gap-1 px-2 pt-2">
          {stories.map((s, i) => (
            <View key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <View className={`h-full bg-white ${i <= indice ? 'w-full' : 'w-0'}`} />
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-2 px-4 py-3">
          <Text className="flex-1 text-base font-semibold text-white">
            {storyAtual.profiles?.nome ?? 'Alguém'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-1">
          {urlQuery.isLoading || !urlQuery.data ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : (
            <Image source={{ uri: urlQuery.data }} className="flex-1" resizeMode="contain" />
          )}

          <Pressable
            onPress={() => setIndice((i) => Math.max(0, i - 1))}
            accessibilityRole="button"
            accessibilityLabel="Story anterior"
            className="absolute bottom-0 left-0 top-0 w-1/3"
          />
          <Pressable
            onPress={() => {
              if (indice + 1 < stories.length) {
                setIndice(indice + 1);
              } else {
                router.back();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Próxima story"
            className="absolute bottom-0 right-0 top-0 w-2/3"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
