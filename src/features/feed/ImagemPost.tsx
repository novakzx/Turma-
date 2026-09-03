import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, View } from 'react-native';

import { obterUrlAssinada } from './api';

/**
 * O bucket de mídia de post é privado (brief 7: nada de link público
 * adivinhável pra conteúdo de menor de idade) — a URL assinada expira em
 * 1h, então cada card busca a sua e o cache do TanStack Query evita
 * pedir de novo a cada re-render.
 */
export function ImagemPost({ caminho }: { caminho: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['url-assinada', caminho],
    queryFn: () => obterUrlAssinada(caminho),
    staleTime: 50 * 60 * 1000,
  });

  if (isLoading || !url) {
    return (
      <View className="h-48 w-full items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      className="h-48 w-full rounded-lg"
      resizeMode="cover"
      accessibilityLabel="Imagem do post"
    />
  );
}
