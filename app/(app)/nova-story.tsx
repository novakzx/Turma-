import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { escolherFotoOuVideo } from '@/features/feed/api';
import { criarStory, fazerUploadImagemStory } from '@/features/social/api';

function PreviaVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ aspectRatio: 9 / 16, width: '100%', borderRadius: 16 }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/** Story dura 24h (`expira_em`, gravado pelo banco — ver migration
 * `seguidores_stories_perfil_publico`). Foto ou vídeo (até 60s) — sem
 * texto por cima, MVP simples, documentado como limitação conhecida.
 * Story não tem coluna de tipo: o vídeo é identificado depois pela
 * extensão do arquivo (`ehVideo`, ver `features/social/types.ts`). */
export default function NovaStory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uriLocal, setUriLocal] = useState<string | null>(null);
  const [tipoMidia, setTipoMidia] = useState<'foto' | 'video' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Sem perfil carregado.');
      if (!uriLocal) throw new Error('Escolha uma foto ou vídeo primeiro.');
      const caminho = await fazerUploadImagemStory(profile.id, uriLocal);
      await criarStory(profile.id, caminho);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories-visiveis'] });
      router.back();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  async function handleEscolher() {
    try {
      setErro(null);
      const escolhida = await escolherFotoOuVideo();
      if (escolhida) {
        setUriLocal(escolhida.uri);
        setTipoMidia(escolhida.tipoMidia);
      }
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function handlePublicar() {
    if (!uriLocal) {
      setErro('Escolha uma foto ou vídeo primeiro.');
      return;
    }
    setErro(null);
    mutation.mutate();
  }

  return (
    <View className="flex-1 gap-4 bg-background px-6 pb-10 pt-6 dark:bg-background-dark">
      <Text className="text-2xl font-bold text-primary dark:text-primary-dark">Nova story</Text>
      <Text className="text-sm text-slate-600 dark:text-slate-400">
        Fica visível por 24h pra quem te segue e pra sua turma.
      </Text>

      {uriLocal && tipoMidia === 'video' ? (
        <PreviaVideo uri={uriLocal} />
      ) : uriLocal ? (
        <Image
          source={{ uri: uriLocal }}
          className="aspect-[9/16] w-full rounded-2xl"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-[9/16] w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800" />
      )}

      <Button
        label={uriLocal ? 'Trocar foto/vídeo' : 'Escolher foto ou vídeo'}
        icon="image-outline"
        variant="secondary"
        onPress={handleEscolher}
      />

      {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}

      <Button
        label="Publicar story"
        icon="paper-plane-outline"
        onPress={handlePublicar}
        loading={mutation.isPending}
      />
    </View>
  );
}
