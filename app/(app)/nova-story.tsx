import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { escolherImagem } from '@/features/feed/api';
import { criarStory, fazerUploadImagemStory } from '@/features/social/api';

/** Story dura 24h (`expira_em`, gravado pelo banco — ver migration
 * `seguidores_stories_perfil_publico`). Só imagem por enquanto, sem
 * texto por cima nem vídeo — MVP simples, documentado como limitação
 * conhecida, dá pra evoluir depois. */
export default function NovaStory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uriLocal, setUriLocal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Sem perfil carregado.');
      if (!uriLocal) throw new Error('Escolha uma imagem primeiro.');
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
    const uri = await escolherImagem();
    if (uri) setUriLocal(uri);
  }

  function handlePublicar() {
    if (!uriLocal) {
      setErro('Escolha uma imagem primeiro.');
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

      {uriLocal ? (
        <Image
          source={{ uri: uriLocal }}
          className="aspect-[9/16] w-full rounded-2xl"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-[9/16] w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800" />
      )}

      <Button
        label={uriLocal ? 'Trocar imagem' : 'Escolher imagem'}
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
