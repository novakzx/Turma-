import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, View } from 'react-native';

/** Foto enviada numa mensagem (DM ou sala), ou imagem gerada pra um
 * slide de apresentação — mesmo padrão de `ImagemPost` (bucket privado,
 * URL assinada com cache do TanStack Query), só que `obterUrl` vem de
 * fora porque cada contexto usa um bucket diferente (`conversas-midia`/
 * `salas-midia`/`apresentacoes-midia`, ver `mensagens/api.ts`,
 * `chat/api.ts` e `estudo/api.ts`). */
export function ImagemChat({
  caminho,
  obterUrl,
  label = 'Foto enviada no chat',
}: {
  caminho: string;
  obterUrl: (caminho: string) => Promise<string>;
  label?: string;
}) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['url-assinada-imagem-chat', caminho],
    queryFn: () => obterUrl(caminho),
    staleTime: 50 * 60 * 1000,
  });

  if (isLoading || !url) {
    return (
      <View
        style={{ width: 220, height: 220 }}
        className="items-center justify-center rounded-lg bg-slate-700"
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: 220, height: 220 }}
      className="rounded-lg"
      resizeMode="cover"
      accessibilityLabel={label}
    />
  );
}
