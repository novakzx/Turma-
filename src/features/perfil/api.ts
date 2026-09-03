import { supabase } from '@/lib/supabase';

/** Turma + nome da escola, pra mostrar na home depois do onboarding. */
export async function buscarTurmaComEscola(turmaId: string) {
  const { data, error } = await supabase
    .from('turmas')
    .select('nome, serie_ano, escolas(nome)')
    .eq('id', turmaId)
    .single();
  if (error) throw error;
  return data;
}
