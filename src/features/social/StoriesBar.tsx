import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AnelStory } from '@/components/ui/AnelStory';
import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

import { listarStoriesVisiveis } from './api';
import type { StoryComAutor } from './types';

const TAMANHO_AVATAR = 60;

function BolinhaStory({
  nome,
  fotoUrl,
  temStory,
  onPress,
}: {
  nome: string;
  fotoUrl: string | null;
  temStory: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Story de ${nome}`}
      className="w-16 items-center gap-1"
    >
      {temStory ? (
        <AnelStory tamanho={TAMANHO_AVATAR}>
          <FotoPerfil caminho={fotoUrl} nome={nome} tamanho={TAMANHO_AVATAR} />
        </AnelStory>
      ) : (
        <FotoPerfil caminho={fotoUrl} nome={nome} tamanho={TAMANHO_AVATAR + 8} />
      )}
      <Text
        numberOfLines={1}
        className="w-16 text-center text-xs text-slate-600 dark:text-slate-400"
      >
        {nome.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

/**
 * Bolinhas de stories no topo do feed/perfil (pedido do usuário, Fase
 * 10). RLS de `stories` já decide quais aparecem aqui (próprio autor,
 * quem se segue, mesma turma) — a primeira bolinha é sempre "Sua
 * story", com "+" quando não tem nenhuma ativa ainda.
 */
export function StoriesBar() {
  const { profile } = useAuth();

  const storiesQuery = useQuery({
    queryKey: ['stories-visiveis'],
    queryFn: listarStoriesVisiveis,
  });

  const porAutor = useMemo(() => {
    const mapa = new Map<string, StoryComAutor[]>();
    for (const story of storiesQuery.data ?? []) {
      const lista = mapa.get(story.autor_id) ?? [];
      lista.push(story);
      mapa.set(story.autor_id, lista);
    }
    return mapa;
  }, [storiesQuery.data]);

  if (!profile) return null;

  const minhasStories = porAutor.get(profile.id) ?? [];
  const outrosAutores = Array.from(porAutor.entries()).filter(
    ([autorId]) => autorId !== profile.id,
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-4 py-3"
    >
      <View className="w-16 items-center gap-1">
        <Pressable
          onPress={() =>
            minhasStories.length > 0
              ? router.push(`/story/${profile.id}`)
              : router.push('/nova-story')
          }
          accessibilityRole="button"
          accessibilityLabel={minhasStories.length > 0 ? 'Sua story' : 'Adicionar story'}
        >
          {minhasStories.length > 0 ? (
            <AnelStory tamanho={TAMANHO_AVATAR}>
              <FotoPerfil caminho={profile.foto_url} nome={profile.nome} tamanho={TAMANHO_AVATAR} />
            </AnelStory>
          ) : (
            <FotoPerfil
              caminho={profile.foto_url}
              nome={profile.nome}
              tamanho={TAMANHO_AVATAR + 8}
            />
          )}
          {minhasStories.length === 0 ? (
            <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary dark:border-background-dark dark:bg-primary-dark">
              <Ionicons name="add" size={12} color="#FFFFFF" />
            </View>
          ) : null}
        </Pressable>
        <Text className="w-16 text-center text-xs text-slate-600 dark:text-slate-400">
          Sua story
        </Text>
      </View>

      {outrosAutores.map(([autorId, stories]) => (
        <BolinhaStory
          key={autorId}
          nome={stories[0].profiles?.nome ?? 'Alguém'}
          fotoUrl={stories[0].profiles?.foto_url ?? null}
          temStory
          onPress={() => router.push(`/story/${autorId}`)}
        />
      ))}
    </ScrollView>
  );
}
