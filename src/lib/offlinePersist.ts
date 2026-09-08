import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

/**
 * Modo offline básico (pedido do usuário): guarda no `AsyncStorage` o
 * cache já carregado das telas de leitura mais úteis sem internet
 * (matérias, notas, chat de estudo, flashcards) — quando o app abre sem
 * rede, essas telas mostram o último dado salvo em vez de tela em
 * branco/erro. Não cobre feed/chat comunitário/mensagens de propósito:
 * são conteúdo em tempo real de outras pessoas, e mostrar uma versão
 * desatualizada como se fosse atual (sem indicação nenhuma de "isso é
 * antigo") é pior do que só dizer "sem conexão" — ao contrário de
 * notas/flashcards, que são só do próprio aluno e não mudam disparado.
 *
 * `buster` muda toda vez que o formato salvo no cache pode ter ficado
 * incompatível com uma versão nova do app (ex.: mudou o shape de um tipo)
 * — incrementar isso invalida qualquer cache antigo salvo no dispositivo
 * em vez de arriscar um crash tentando usar um formato velho.
 */
const BUSTER = 'v1';

const CHAVES_PERSISTIVEIS = [
  'materias',
  'chat-ia',
  'estatistica-semanal-estudo',
  'flashcards-devidos',
  'flashcards-materia',
  'avaliacoes',
];

export function deveHidratarQuery(query: Query): boolean {
  const chaveRaiz = query.queryKey[0];
  return typeof chaveRaiz === 'string' && CHAVES_PERSISTIVEIS.includes(chaveRaiz);
}

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'turma-mais-cache-offline',
});

export const OFFLINE_PERSIST_OPTIONS: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: asyncStoragePersister,
  buster: BUSTER,
  maxAge: 1000 * 60 * 60 * 24 * 3, // 3 dias — cache mais velho que isso é descartado sozinho
  dehydrateOptions: {
    shouldDehydrateQuery: deveHidratarQuery,
  },
};
