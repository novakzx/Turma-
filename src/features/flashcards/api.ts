import { supabase } from '@/lib/supabase';

import { calcularProximaRevisao, type QualidadeRevisao } from './regras';
import type { Flashcard } from './types';

export async function listarFlashcardsDaMateria(materiaId: string): Promise<Flashcard[]> {
  // RLS já restringe a `aluno_id = auth.uid()` — não precisa filtrar aqui.
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('materia_id', materiaId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

/** Cartões devidos pra revisar (`proxima_revisao <= hoje`) em qualquer
 * matéria do aluno — a tela de revisão mistura tudo, não separa por
 * matéria (é a mesma ideia do Anki/Duolingo: revisa o que está devido,
 * não escolhe o que quer revisar). */
export async function listarFlashcardsDevidos(alunoId: string): Promise<Flashcard[]> {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('aluno_id', alunoId)
    .lte('proxima_revisao', hojeISO)
    .order('proxima_revisao');
  if (error) throw error;
  return data;
}

export async function criarFlashcard(params: {
  alunoId: string;
  materiaId: string;
  pergunta: string;
  resposta: string;
}) {
  const { error } = await supabase.from('flashcards').insert({
    aluno_id: params.alunoId,
    materia_id: params.materiaId,
    pergunta: params.pergunta,
    resposta: params.resposta,
  });
  if (error) throw error;
}

export async function apagarFlashcard(id: string) {
  const { error } = await supabase.from('flashcards').delete().eq('id', id);
  if (error) throw error;
}

/** Grava o resultado de uma revisão — a conta de verdade (próximo
 * intervalo/fator/data) é `calcularProximaRevisao`, testável sem banco;
 * aqui só persiste o resultado. */
export async function revisarFlashcard(cartao: Flashcard, qualidade: QualidadeRevisao) {
  const resultado = calcularProximaRevisao(
    { intervaloDias: cartao.intervalo_dias, fatorFacilidade: cartao.fator_facilidade },
    qualidade,
  );
  const { error } = await supabase
    .from('flashcards')
    .update({
      intervalo_dias: resultado.intervaloDias,
      fator_facilidade: resultado.fatorFacilidade,
      proxima_revisao: resultado.proximaRevisao,
    })
    .eq('id', cartao.id);
  if (error) throw error;
}
