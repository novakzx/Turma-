import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { apagarStory, listarStoriesDoAutor, obterUrlAssinadaStory } from '@/features/social/api';
import { ehVideo } from '@/features/social/types';

/** `window.confirm` no web, `Alert.alert` nativo — mesmo padrão já
 * usado em outras telas (`Alert.alert` não tem UI no navegador). */
function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Apagar story', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: aoConfirmar },
  ]);
}

function StoryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => p.play());
  return (
    <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
  );
}

/** Visualizador de story — id da rota é o AUTOR (não o story
 * individual), já que uma pessoa pode ter várias ativas ao mesmo
 * tempo. Toque na metade direita avança, na esquerda volta — sem
 * temporizador automático (MVP simples, documentado como limitação
 * conhecida). RLS de `stories` já decide se essa lista vem vazia ou
 * não pra quem está vendo. */
export default function StoryViewer() {
  const { id: autorId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [indice, setIndice] = useState(0);

  const storiesQuery = useQuery({
    queryKey: ['stories-do-autor', autorId],
    queryFn: () => listarStoriesDoAutor(autorId),
  });

  const stories = storiesQuery.data ?? [];
  const storyAtual = stories[indice];
  const ehDono = !!profile && storyAtual?.autor_id === profile.id;

  const urlQuery = useQuery({
    queryKey: ['url-assinada-story', storyAtual?.midia_url],
    queryFn: () => obterUrlAssinadaStory(storyAtual!.midia_url),
    enabled: !!storyAtual,
  });

  const apagarMutation = useMutation({
    mutationFn: () => apagarStory(storyAtual!.id),
    onSuccess: () => {
      // Invalida tanto a lista deste autor (recalcula o índice atual
      // pra a próxima story, se sobrar alguma) quanto a lista geral
      // (StoriesBar precisa parar de mostrar o anel de "tem story" se
      // essa era a última).
      queryClient.invalidateQueries({ queryKey: ['stories-do-autor', autorId] });
      queryClient.invalidateQueries({ queryKey: ['stories-visiveis'] });
      if (stories.length <= 1) {
        router.back();
      } else if (indice >= stories.length - 1) {
        setIndice(indice - 1);
      }
    },
  });

  function handleApagar() {
    confirmar('Apagar essa story? Não dá pra desfazer.', () => apagarMutation.mutate());
  }

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

        <View className="flex-row items-center gap-1 px-2 py-1">
          <Text className="flex-1 px-2 text-base font-semibold text-white">
            {storyAtual.profiles?.nome ?? 'Alguém'}
          </Text>
          {ehDono ? (
            <Pressable
              onPress={handleApagar}
              disabled={apagarMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Apagar esta story"
              className="min-h-11 min-w-11 items-center justify-center"
            >
              {apagarMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              )}
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-1">
          {urlQuery.isLoading || !urlQuery.data ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : ehVideo(storyAtual.midia_url) ? (
            <StoryVideo uri={urlQuery.data} />
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
