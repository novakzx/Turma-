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

/** Fase 8: matéria deixa de ser só gerenciável pelo Studio — staff da
 * escola da turma pode criar/renomear/apagar (RLS restringe quem
 * realmente consegue; ver migration `materias_gerenciaveis`). */
export async function criarMateria(params: { turmaId: string; nome: string }) {
  const { error } = await supabase
    .from('materias')
    .insert({ turma_id: params.turmaId, nome: params.nome });
  if (error) throw error;
}

export async function renomearMateria(id: string, nome: string) {
  const { error } = await supabase.from('materias').update({ nome }).eq('id', id);
  if (error) throw error;
}

/** Destrutivo: avaliacoes, histórico de chat com IA e a sala de chat da
 * matéria são apagados junto (ON DELETE CASCADE) — o app confirma com o
 * usuário antes de chamar isso. */
export async function apagarMateria(id: string) {
  const { error } = await supabase.from('materias').delete().eq('id', id);
  if (error) throw error;
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

export type AvaliacaoComMateria = Avaliacao & { materias: { nome: string } | null };

/** Todas as avaliações do aluno com data marcada (pro calendário integrado
 * — pedido do usuário), de qualquer matéria — diferente de
 * `listarAvaliacoes`, que é por matéria (usado na calculadora de notas).
 * RLS já restringe a `aluno_id = auth.uid()`. Traz o nome da matéria junto
 * (`materias(nome)`) pra não precisar de uma segunda consulta por item. */
export async function listarTodasAvaliacoesComData(
  alunoId: string,
): Promise<AvaliacaoComMateria[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*, materias(nome)')
    .eq('aluno_id', alunoId)
    .not('data', 'is', null)
    .order('data');
  if (error) throw error;
  return data;
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
