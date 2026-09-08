import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { supabase } from '@/lib/supabase';

/**
 * Tradução automática de post (pedido do usuário). A Edge Function é
 * quem fala com a Gemini — o app nunca vê a API key (mesma regra do
 * chat-estudo, ver `supabase/functions/traduzir-texto/index.ts`).
 */
export async function traduzirTexto(texto: string, idioma: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('traduzir-texto', {
    body: { texto, idioma },
  });
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data.traducao;
}
