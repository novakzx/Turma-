import { supabase } from '@/lib/supabase';

export async function listarEscolas() {
  const { data, error } = await supabase.from('escolas').select('id, nome').order('nome');
  if (error) throw error;
  return data;
}

export async function listarTurmasPorEscola(escolaId: string) {
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, serie_ano')
    .eq('escola_id', escolaId)
    .order('serie_ano')
    .order('nome');
  if (error) throw error;
  return data;
}

export async function concluirOnboarding(params: {
  userId: string;
  escolaId: string;
  turmaId: string;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({ escola_id: params.escolaId, turma_id: params.turmaId })
    .eq('id', params.userId);
  if (error) throw error;
}
