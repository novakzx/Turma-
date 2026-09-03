/**
 * Filtro de palavrões (brief seção 7: "Filtro básico de linguagem
 * ofensiva antes de bloquear em regra de negociação mais sofisticada
 * — comece simples, documente que dá pra evoluir").
 *
 * A censura de verdade acontece no banco, num trigger `BEFORE INSERT
 * OR UPDATE` em `posts`/`post_comentarios`/`mensagens_chat`/
 * `mensagens_diretas` (ver migration `filtro_palavroes`) — um filtro
 * só aqui no cliente é decorativo, porque qualquer requisição direta
 * pra API passaria reto. Essa cópia em TypeScript existe pra ter a
 * regra testada (`npm test` cobra teste de lógica de negócio real) e
 * documentada num só lugar de fácil leitura — mantenha as duas listas
 * iguais se for editar uma.
 */
const PALAVRAS_PROIBIDAS = [
  'porra',
  'merda',
  'caralho',
  'puta',
  'fdp',
  'foda-se',
  'fodase',
  'foda',
  'fodido',
  'fodida',
  'cabrao',
  'cabrão',
  'arrombado',
  'cuzao',
  'cuzão',
  'boceta',
  'picha',
  'viado',
  'desgraca',
  'desgraça',
] as const;

function escaparRegex(palavra: string): string {
  return palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function censurarTexto<T extends string | null | undefined>(texto: T): T {
  if (!texto) return texto;
  let resultado: string = texto;
  for (const palavra of PALAVRAS_PROIBIDAS) {
    const regex = new RegExp(`\\b${escaparRegex(palavra)}\\b`, 'gi');
    resultado = resultado.replace(regex, '*'.repeat(palavra.length));
  }
  return resultado as T;
}
