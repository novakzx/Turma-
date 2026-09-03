import { supabase } from '@/lib/supabase';

import type { Avaliacao, Materia } from './types';

export async function listarMateriasDaTurma(turmaId: string): Promise<Materia[]> {
  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .eq('turma_id', turmaId)
    .order('nome');
  if (error) throw error;
  return data;
}

/** Escala de nota da escola do aluno (brief 6.3: configurável, 0-10 ou
 * 0-20, nunca fixa no código). */
export async function buscarNotaMaximaDaEscola(escolaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('escolas')
    .select('nota_maxima')
    .eq('id', escolaId)
    .single();
  if (error) throw error;
  return data.nota_maxima;
}

export async function listarAvaliacoes(materiaId: string): Promise<Avaliacao[]> {
  // RLS já restringe a `aluno_id = auth.uid()` — não precisa filtrar aqui.
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('materia_id', materiaId)
    .order('criado_em');
  if (error) throw error;
  return data;
}

export async function criarAvaliacao(params: {
  alunoId: string;
  materiaId: string;
  nome: string;
  peso: number;
  nota: number | null;
  data: string | null;
}) {
  const { error } = await supabase.from('avaliacoes').insert({
    aluno_id: params.alunoId,
    materia_id: params.materiaId,
    nome: params.nome,
    peso: params.peso,
    nota: params.nota,
    data: params.data,
  });
  if (error) throw error;
}

export async function atualizarNotaAvaliacao(id: string, nota: number | null) {
  const { error } = await supabase.from('avaliacoes').update({ nota }).eq('id', id);
  if (error) throw error;
}

export async function apagarAvaliacao(id: string) {
  const { error } = await supabase.from('avaliacoes').delete().eq('id', id);
  if (error) throw error;
}
