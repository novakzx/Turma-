import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { supabase } from '@/lib/supabase';

export type Inscricao = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  criado_em: string;
};

/**
 * Grava o interessado na lista de acesso antecipado -- chamado direto do
 * cliente com a chave anônima (sem Edge Function no meio: RLS já
 * permite `insert` pra qualquer um, ver migration `inscricoes_lancamento`).
 */
export async function inscreverAcessoAntecipado(params: {
  nome: string;
  telefone: string;
  email: string;
}): Promise<void> {
  const { error } = await supabase.from('inscricoes_lancamento').insert({
    nome: params.nome.trim(),
    telefone: params.telefone.trim(),
    email: params.email.trim().toLowerCase(),
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Esse e-mail já está na lista de acesso antecipado.');
    }
    throw new Error(error.message);
  }
}

/** Lista as inscrições -- painel admin, senha conferida na Edge Function. */
export async function listarInscricoes(senha: string): Promise<Inscricao[]> {
  const { data, error } = await supabase.functions.invoke<{ inscricoes: Inscricao[] }>(
    'inscricoes-lancamento',
    { method: 'GET', headers: { 'x-admin-senha': senha } },
  );
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data?.inscricoes ?? [];
}

/** Apaga uma inscrição (linha de teste/spam) -- mesma senha do painel. */
export async function apagarInscricao(senha: string, id: string): Promise<void> {
  // `invoke` só monta `<url-base>/<nome>` -- o `id` vai embutido no nome
  // como query string pra chegar como `?id=...` no lado da função
  // (que o lê de `new URL(req.url).searchParams`, não do corpo).
  const { error } = await supabase.functions.invoke(
    `inscricoes-lancamento?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: { 'x-admin-senha': senha } },
  );
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
}
