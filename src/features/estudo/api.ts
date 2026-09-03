import { supabase } from '@/lib/supabase';

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

/**
 * A Edge Function é quem fala com a Anthropic e grava as duas mensagens
 * (usuário + assistente) — o app nunca chama a API da Anthropic direto
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

/**
 * `supabase.functions.invoke` só devolve "Edge Function returned a
 * non-2xx status code" por padrão — o corpo de verdade (o `{ error }`
 * que a função monta) fica em `error.context`, uma Response crua que
 * precisa ser lida à parte.
 */
async function mensagemDoErroDaFuncao(error: unknown): Promise<string> {
  const contexto = (error as { context?: Response } | undefined)?.context;
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json();
      if (typeof corpo?.error === 'string') return corpo.error;
    } catch {
      // corpo não era JSON — cai pro fallback abaixo.
    }
  }
  return error instanceof Error ? error.message : String(error);
}
