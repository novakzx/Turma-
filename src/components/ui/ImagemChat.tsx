import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, View } from 'react-native';

/** Foto enviada numa mensagem (DM ou sala) — mesmo padrão de
 * `ImagemPost` (bucket privado, URL assinada com cache do TanStack
 * Query), só que `obterUrl` vem de fora porque DM e sala usam buckets
 * diferentes (`conversas-midia`/`salas-midia`, ver `mensagens/api.ts` e
 * `chat/api.ts`).
 *
 * `urlPreAssinada` (pedido do usuário — "demora pra carregar as
 * imagens"): quando `listarMensagens` já assinou tudo em lote, passa
 * ela pronta aqui e nenhuma requisição extra acontece. Sem essa prop,
 * cai no comportamento antigo — busca a própria URL sozinha. */
export function ImagemChat({
  caminho,
  obterUrl,
  urlPreAssinada,
}: {
  caminho: string;
  obterUrl: (caminho: string) => Promise<string>;
  urlPreAssinada?: string | null;
}) {
  const { data: urlBuscada, isLoading } = useQuery({
    queryKey: ['url-assinada-imagem-chat', caminho],
    queryFn: () => obterUrl(caminho),
    staleTime: 50 * 60 * 1000,
    enabled: !urlPreAssinada,
  });
  const url = urlPreAssinada ?? urlBuscada;

  if ((!urlPreAssinada && isLoading) || !url) {
    return (
      <View
        style={{ width: 220, height: 220 }}
        className="items-center justify-center rounded-lg bg-slate-100"
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
      accessibilityLabel="Foto enviada no chat"
    />
  );
}
