import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente único do TanStack Query pra todo o app.
 * `staleTime` moderado evita refetch agressivo em telas de leitura
 * (mural de avisos, feed) sem esconder dado desatualizado por muito tempo.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
    },
  },
});
