import { supabase } from '@/lib/supabase';
import type { PerfilResumo } from '@/features/social/types';

/** Busca global de usuário por nome ou @usuário (brief seção 9). RLS
 * de `profiles` já decide quem aparece pra quem está buscando (perfil
 * público, mesma turma/escola, staff, ou o próprio) — a mesma régua
 * usada em todo o app desde a Fase 10, então essa busca nunca vaza
 * ninguém que já não apareceria via `perfil/[id]`. */
export async function buscarUsuarios(termo: string, meuId: string): Promise<PerfilResumo[]> {
  const termoLimpo = termo.trim().replace(/^@/, '');
  if (!termoLimpo) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, nome_usuario, foto_url')
    .neq('id', meuId)
    .or(`nome.ilike.%${termoLimpo}%,nome_usuario.ilike.%${termoLimpo}%`)
    .order('nome')
    .limit(30);
  if (error) throw error;
  return data;
}

/** Resolve um @usuário mencionado (ver `TextoComMencoes`) pro perfil de
 * verdade — mesma régua de RLS de `profiles` que já vale pro resto do app:
 * mencionar alguém fora do alcance de visibilidade (perfil privado de
 * outra escola, por ex.) simplesmente não resolve nada, sem vazar que a
 * conta existe. */
export async function buscarPerfilPorNomeUsuario(
  nomeUsuario: string,
): Promise<Pick<PerfilResumo, 'id' | 'nome' | 'nome_usuario' | 'foto_url'> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, nome_usuario, foto_url')
    .eq('nome_usuario', nomeUsuario.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}
