/**
 * Supabase Auth devolve mensagem de erro em inglês, direto da API. Traduz
 * as mais comuns pra não mostrar erro em outro idioma pro aluno; o que não
 * está mapeado aparece como veio (melhor que engolir o erro em silêncio).
 */
const TRADUCOES: Record<string, string> = {
  'Invalid login credentials': 'Usuário ou senha incorretos.',
  'User already registered': 'Já existe uma conta com esses dados.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar — veja sua caixa de entrada.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Esse e-mail não parece válido.',
};

// Erro de constraint do Postgres não é uma mensagem fixa (vem com o nome
// da constraint dentro), então não dá pra usar o dicionário de tradução
// exata acima — casa por trecho da mensagem em vez disso.
const TRADUCOES_PARCIAIS: [substring: string, mensagem: string][] = [
  ['profiles_nome_usuario_key', 'Esse nome de usuário já está em uso.'],
  [
    'profiles_nome_usuario_formato',
    'Nome de usuário: só letras minúsculas, número e "_", 3 a 20 caracteres.',
  ],
];

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
  if (TRADUCOES[bruta]) return TRADUCOES[bruta];
  const parcial = TRADUCOES_PARCIAIS.find(([trecho]) => bruta.includes(trecho));
  return parcial ? parcial[1] : bruta;
}
