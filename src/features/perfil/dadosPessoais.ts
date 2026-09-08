import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { exportarArquivoTexto } from '@/lib/exportarArquivo';
import { supabase } from '@/lib/supabase';

/**
 * "Exportar meus dados" (pedido do usuário) — junta tudo que o próprio
 * aluno gerou, olhando pelas mesmas tabelas de sempre com o client
 * normal (RLS já restringe cada uma a `= auth.uid()`, então não tem
 * como isto trazer dado de outra pessoa mesmo que o `alunoId` passado
 * fosse forjado — a consulta simplesmente não bate com a policy e volta
 * vazia). Formato JSON simples, não é o dado bruto do banco 1:1 (ex.:
 * sem coluna interna tipo `id` de FK) — é o suficiente pra "o que a
 * Turma+ tem sobre mim", não um dump de schema.
 */
export async function exportarMeusDados(alunoId: string) {
  const [
    perfil,
    posts,
    comentarios,
    mensagensChat,
    mensagensDiretas,
    chatIa,
    avaliacoes,
    flashcards,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', alunoId).single(),
    supabase.from('posts').select('*').eq('autor_id', alunoId),
    supabase.from('post_comentarios').select('*').eq('autor_id', alunoId),
    supabase.from('mensagens_chat').select('*').eq('autor_id', alunoId),
    supabase.from('mensagens_diretas').select('*').eq('autor_id', alunoId),
    supabase.from('chat_ia_mensagens').select('*').eq('aluno_id', alunoId),
    supabase.from('avaliacoes').select('*').eq('aluno_id', alunoId),
    supabase.from('flashcards').select('*').eq('aluno_id', alunoId),
  ]);

  for (const resultado of [
    perfil,
    posts,
    comentarios,
    mensagensChat,
    mensagensDiretas,
    chatIa,
    avaliacoes,
    flashcards,
  ]) {
    if (resultado.error) throw resultado.error;
  }

  const pacote = {
    gerado_em: new Date().toISOString(),
    perfil: perfil.data,
    posts: posts.data,
    comentarios: comentarios.data,
    mensagens_de_sala: mensagensChat.data,
    mensagens_diretas: mensagensDiretas.data,
    chat_com_ia: chatIa.data,
    avaliacoes: avaliacoes.data,
    flashcards: flashcards.data,
  };

  await exportarArquivoTexto(
    JSON.stringify(pacote, null, 2),
    'turma-mais-meus-dados.json',
    'application/json',
  );
}

/**
 * "Apagar minha conta" (brief original, seção 7 — nunca tinha ganhado
 * botão nenhum até agora). Não dá pra fazer isso só com o client normal:
 * apagar de `auth.users` exige a service role (`auth.admin.deleteUser`),
 * que só existe do lado da Edge Function — o app só chama, autenticado
 * com a própria sessão (ver `supabase/functions/excluir-conta/index.ts`).
 * `profiles.id` referencia `auth.users(id) on delete cascade`, e todo o
 * resto (posts, mensagens, avaliações, flashcards...) já cascade a
 * partir de `profiles` — apagar o usuário no Auth é o suficiente pra
 * limpar tudo, sem precisar de uma query de limpeza por tabela aqui.
 */
export async function excluirMinhaConta() {
  const { error } = await supabase.functions.invoke('excluir-conta');
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
}
