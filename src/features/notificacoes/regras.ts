import type { CurtidaRecebida } from './types';

/** Junta curtidas de post e de story numa lista cronológica só (mais
 * recente primeiro) — a página de notificações mostra as duas juntas,
 * mas vêm de duas queries/tabelas separadas (`post_curtidas`/
 * `story_curtidas`), então precisa mesclar em vez de só concatenar. */
export function mesclarCurtidas(
  curtidasPosts: CurtidaRecebida[],
  curtidasStories: CurtidaRecebida[],
): CurtidaRecebida[] {
  return [...curtidasPosts, ...curtidasStories].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}
