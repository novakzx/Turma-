/**
 * `supabase.functions.invoke` só devolve "Edge Function returned a
 * non-2xx status code" por padrão — o corpo de verdade (o `{ error }`
 * que a função monta) fica em `error.context`, uma Response crua que
 * precisa ser lida à parte. Extraído aqui (era duplicado em `estudo/api.ts`)
 * pra toda chamada de Edge Function nova reusar o mesmo parsing.
 */
export async function mensagemDoErroDaFuncao(error: unknown): Promise<string> {
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
