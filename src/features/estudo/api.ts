import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { supabase } from '@/lib/supabase';

import { calcularEstatisticaSemanal, type EstatisticaSemanal } from './regras';
import type { MensagemChatIA, ModoChatEstudo } from './types';

export async function listarHistoricoChat(materiaId: string): Promise<MensagemChatIA[]> {
  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('*')
    .eq('materia_id', materiaId)
    .order('criado_em');
  if (error) throw error;
  return data;
}

/** Só as perguntas (`papel = 'usuario'`) dos últimos 7 dias — a lógica
 * de agregação de verdade (contar matéria diferente, achar o dia mais
 * ativo) fica em `calcularEstatisticaSemanal` (testável sem banco). */
export async function buscarEstatisticaSemanal(alunoId: string): Promise<EstatisticaSemanal> {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('materia_id, criado_em')
    .eq('aluno_id', alunoId)
    .eq('papel', 'usuario')
    .gte('criado_em', seteDiasAtras.toISOString());
  if (error) throw error;

  return calcularEstatisticaSemanal(data);
}

/**
 * A Edge Function é quem fala com a Gemini e grava as duas mensagens
 * (usuário + assistente) — o app nunca chama a API da Gemini direto
 * (regra de ouro do brief, seção 4).
 */
export async function enviarMensagemChat(params: {
  materiaId: string;
  mensagem: string;
  modo: ModoChatEstudo;
}): Promise<{ resposta: string; modelo: string }> {
  const { data, error } = await supabase.functions.invoke('chat-estudo', {
    body: { materiaId: params.materiaId, mensagem: params.mensagem, modo: params.modo },
  });
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data;
}
