/**
 * `supabase.functions.invoke` só devolve "Edge Function returned a
 * non-2xx status code" por padrão — o corpo de verdade (o `{ error }`
 * que a função monta) fica em `error.context`, uma Response crua que
 * precisa ser lida à parte. Extraído aqui (era duplicado em `estudo/api.ts`)
 * pra toda chamada de Edge Function nova reusar o mesmo parsing.
 */
export async function mensagemDoErroDaFuncao(error: unknown): Promise<string> {
  const contexto = (error as { context?: unknown } | undefined)?.context;

  // Timeout (opção `timeout` do `invoke` — ver `enviarMensagemChat`):
  // o supabase-js aborta o fetch sozinho e embrulha o `AbortError` num
  // `FunctionsFetchError` cuja `.message` fixa é "Failed to send a
  // request to the Edge Function" — texto que parece falha de rede/CORS,
  // não "demorou demais". Achado depois de trocar o chat de IA pra
  // Cloudflare Workers AI: a primeira chamada a um modelo "frio" (que
  // ninguém usou ainda nesse período) pode demorar bem mais que as
  // seguintes — sem essa mensagem certa, o aluno só via um erro confuso
  // depois de esperar o botão "carregando" por muito tempo.
  if (contexto instanceof DOMException && contexto.name === 'AbortError') {
    return 'Isso demorou demais pra responder — tenta de novo.';
  }

  if (
    contexto &&
    typeof contexto === 'object' &&
    'json' in contexto &&
    typeof (contexto as Response).json === 'function'
  ) {
    try {
      const corpo = await (contexto as Response).json();
      if (typeof corpo?.error === 'string') return corpo.error;
    } catch {
      // corpo não era JSON — cai pro fallback abaixo.
    }
  }
  return error instanceof Error ? error.message : String(error);
}
