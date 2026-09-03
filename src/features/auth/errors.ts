/**
 * Supabase Auth devolve mensagem de erro em inglês, direto da API. Traduz
 * as mais comuns pra não mostrar erro em outro idioma pro aluno; o que não
 * está mapeado aparece como veio (melhor que engolir o erro em silêncio).
 */
const TRADUCOES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com esse e-mail.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar — veja sua caixa de entrada.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Esse e-mail não parece válido.',
};

export function mensagemDeErro(error: unknown): string {
  // Erros do supabase-js (PostgrestError, AuthError, StorageError) nem
  // sempre são `instanceof Error` — são objetos simples com `.message`.
  // `String(objeto)` sem isso vira "[object Object]" e esconde o erro real.
  const bruta =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return TRADUCOES[bruta] ?? bruta;
}
