import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, View } from 'react-native';

import { obterUrlAssinada } from './api';

/**
 * O bucket de mídia de post é privado (brief 7: nada de link público
 * adivinhável pra conteúdo de menor de idade) — a URL assinada expira em
 * 1h.
 *
 * `urlPreAssinada` é o caminho novo (pedido do usuário — "demora muito
 * pra carregar as imagens"): quando quem chama já assinou a URL em lote
 * (ver `comUrlsDeImagemAssinadas` em `feed/api.ts`), passa ela pronta
 * aqui e nenhuma requisição extra acontece. Sem essa prop (chamadores
 * que ainda não migraram), cai no comportamento antigo — busca a própria
 * URL assinada sozinho, com cache do TanStack Query evitando pedir de
 * novo a cada re-render.
 */
export function ImagemPost({
  caminho,
  urlPreAssinada,
}: {
  caminho: string;
  urlPreAssinada?: string | null;
}) {
  const { data: urlBuscada, isLoading } = useQuery({
    queryKey: ['url-assinada', caminho],
    queryFn: () => obterUrlAssinada(caminho),
    staleTime: 50 * 60 * 1000,
    enabled: !urlPreAssinada,
  });
  const url = urlPreAssinada ?? urlBuscada;

  if ((!urlPreAssinada && isLoading) || !url) {
    return (
      <View className="aspect-square w-full items-center justify-center bg-slate-100">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      className="aspect-square w-full"
      resizeMode="cover"
      accessibilityLabel="Imagem do post"
    />
  );
}
