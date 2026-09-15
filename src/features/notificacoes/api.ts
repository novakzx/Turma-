import { supabase } from '@/lib/supabase';
import type { PerfilResumo } from '@/features/social/types';

import type { CurtidaRecebida, NovoSeguidor } from './types';

const SELECT_PERFIL_RESUMO = 'id, nome, nome_usuario, foto_url';

/** Curtidas recebidas em posts (não em quem EU curti — RLS de
 * `post_curtidas` já filtra pra quem tem acesso ao post, então só
 * precisa restringir pelo dono do post, `posts.autor_id`). `!inner`
 * é necessário pro PostgREST aceitar filtrar por uma coluna da tabela
 * relacionada (`.eq('posts.autor_id', ...)`). Exclui curtida do
 * próprio dono no próprio post (não é notificação de verdade). */
export async function listarCurtidasEmPosts(
  meuId: string,
  limite = 20,
): Promise<CurtidaRecebida[]> {
  const { data, error } = await supabase
    .from('post_curtidas')
    .select(`id, criado_em, post_id, profiles:autor_id(${SELECT_PERFIL_RESUMO}), posts!inner(autor_id)`)
    .eq('posts.autor_id', meuId)
    .neq('autor_id', meuId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (
    data as unknown as {
      id: string;
      criado_em: string;
      post_id: string;
      profiles: PerfilResumo | null;
    }[]
  )
    .filter((linha): linha is typeof linha & { profiles: PerfilResumo } => !!linha.profiles)
    .map((linha) => ({
      id: linha.id,
      criadoEm: linha.criado_em,
      tipo: 'post' as const,
      itemId: linha.post_id,
      autor: linha.profiles,
    }));
}

/** Mesma ideia de `listarCurtidasEmPosts`, pra `story_curtidas`. */
export async function listarCurtidasEmStories(
  meuId: string,
  limite = 20,
): Promise<CurtidaRecebida[]> {
  const { data, error } = await supabase
    .from('story_curtidas')
    .select(
      `id, criado_em, story_id, profiles:autor_id(${SELECT_PERFIL_RESUMO}), stories!inner(autor_id)`,
    )
    .eq('stories.autor_id', meuId)
    .neq('autor_id', meuId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (
    data as unknown as {
      id: string;
      criado_em: string;
      story_id: string;
      profiles: PerfilResumo | null;
    }[]
  )
    .filter((linha): linha is typeof linha & { profiles: PerfilResumo } => !!linha.profiles)
    .map((linha) => ({
      id: linha.id,
      criadoEm: linha.criado_em,
      tipo: 'story' as const,
      itemId: linha.story_id,
      autor: linha.profiles,
    }));
}

/** Quem começou a seguir o usuário, mais recente primeiro. */
export async function listarNovosSeguidores(meuId: string, limite = 20): Promise<NovoSeguidor[]> {
  const { data, error } = await supabase
    .from('seguidores')
    .select(`id, criado_em, profiles:seguidor_id(${SELECT_PERFIL_RESUMO})`)
    .eq('seguido_id', meuId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data as unknown as { id: string; criado_em: string; profiles: PerfilResumo | null }[])
    .filter((linha): linha is typeof linha & { profiles: PerfilResumo } => !!linha.profiles)
    .map((linha) => ({ id: linha.id, criadoEm: linha.criado_em, perfil: linha.profiles }));
}

/** Sugestões de amizade — v1 simples: colegas da mesma turma que o
 * usuário ainda não segue (fonte mais óbvia de gente que ele conhece
 * de verdade, já que turma é a unidade social principal do app; sem
 * algoritmo de "amigos em comum", fica pra depois se precisar). */
export async function listarSugestoesAmizade(
  meuId: string,
  turmaId: string | null,
  limite = 10,
): Promise<PerfilResumo[]> {
  if (!turmaId) return [];

  const { data: seguindo, error: erroSeguindo } = await supabase
    .from('seguidores')
    .select('seguido_id')
    .eq('seguidor_id', meuId);
  if (erroSeguindo) throw erroSeguindo;
  const idsExcluidos = [meuId, ...(seguindo ?? []).map((s) => s.seguido_id)];

  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT_PERFIL_RESUMO)
    .eq('turma_id', turmaId)
    .not('id', 'in', `(${idsExcluidos.join(',')})`)
    .limit(limite);
  if (error) throw error;
  return data as unknown as PerfilResumo[];
}
