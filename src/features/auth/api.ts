import { supabase } from '@/lib/supabase';

import type { Profile } from './types';

export async function signUp(params: { nome: string; email: string; senha: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.senha,
    // Guardado em user_metadata pra fetchOrCreateProfile usar no primeiro
    // login como valor inicial de `nome` (signUp pode não devolver sessão
    // se a confirmação de e-mail estiver ligada, então o profile só é
    // criado depois, no primeiro signIn bem-sucedido).
    options: { data: { nome: params.nome } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(params: { email: string; senha: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.senha,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Garante que existe uma linha em `profiles` pro usuário logado, criando
 * uma se for a primeira vez. Não dá pra criar isso no momento do signUp
 * porque, com confirmação de e-mail ligada, ainda não existe sessão
 * autenticada nesse momento (a policy de insert exige auth.uid() = id).
 */
export async function fetchOrCreateProfile(
  userId: string,
  fallback: { email: string; nome?: string },
): Promise<Profile> {
  const { data: existente, error: erroSelect } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (erroSelect) throw erroSelect;
  if (existente) return existente;

  const nome = fallback.nome?.trim() || fallback.email;
  const { data: criado, error: erroInsert } = await supabase
    .from('profiles')
    .insert({ id: userId, email: fallback.email, nome })
    .select('*')
    .single();
  if (erroInsert) throw erroInsert;
  return criado;
}
