import { supabase } from '@/lib/supabase';

export async function listarEscolas() {
  const { data, error } = await supabase
    .from('escolas')
    .select('id, nome, dominio_email')
    .order('nome');
  if (error) throw error;
  return data;
}

/** Turma institucional (`criado_por` null, veio do seed) ou criada por
 * um usuário — a lista mistura os dois; `criado_por` é o que diferencia
 * entrada direta de "precisa pedir" na tela de onboarding. */
export async function listarTurmasPorEscola(escolaId: string) {
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, serie_ano, criado_por')
    .eq('escola_id', escolaId)
    .order('serie_ano')
    .order('nome');
  if (error) throw error;
  return data;
}

/** Só grava quando a idade não bate com a série escolhida (pedido do
 * usuário) — o resto do tempo `anos_reprovados` fica vazio, que é o
 * padrão da coluna. */
export async function atualizarAnosReprovados(userId: string, anos: number[]) {
  const { error } = await supabase
    .from('profiles')
    .update({ anos_reprovados: anos })
    .eq('id', userId);
  if (error) throw error;
}

export async function concluirOnboarding(params: {
  userId: string;
  escolaId: string;
  turmaId: string;
  numeroCartao: string;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({
      escola_id: params.escolaId,
      turma_id: params.turmaId,
      numero_cartao_estudante: params.numeroCartao,
    })
    .eq('id', params.userId);
  if (error) throw error;
}

/** Pedido de entrada numa turma criada por outro usuário — só o dono
 * dela (ou staff da escola) aprova, via RPC `responder_pedido_entrada_turma`
 * (nunca update direto: profiles.turma_id de outra pessoa não é
 * grantável pro cliente comum). */
export async function pedirEntradaNaTurma(
  turmaId: string,
  profileId: string,
  numeroCartao: string,
) {
  // Grava o cartão já aqui (não só em `concluirOnboarding`) — quem pede
  // entrada ainda não tem `turma_id`/`escola_id` (só ganha depois de
  // aprovado), mas a verificação de estudante não deveria esperar por
  // isso.
  const { error: erroPerfil } = await supabase
    .from('profiles')
    .update({ numero_cartao_estudante: numeroCartao })
    .eq('id', profileId);
  if (erroPerfil) throw erroPerfil;

  const { error } = await supabase
    .from('turma_pedidos_entrada')
    .insert({ turma_id: turmaId, profile_id: profileId });
  if (error) throw error;
}

export async function buscarMeuPedidoPendente(turmaId: string, profileId: string) {
  const { data, error } = await supabase
    .from('turma_pedidos_entrada')
    .select('*')
    .eq('turma_id', turmaId)
    .eq('profile_id', profileId)
    .eq('status', 'pendente')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Pedidos pendentes das turmas que EU criei — pra tela de "Pedidos de
 * entrada" (só existe algo aqui se o usuário for dono de alguma
 * turma). */
export async function listarPedidosDasMinhasTurmas(profileId: string) {
  const { data, error } = await supabase
    .from('turma_pedidos_entrada')
    .select(
      '*, profiles!turma_pedidos_entrada_profile_id_fkey(nome), turmas!inner(nome, serie_ano, criado_por)',
    )
    .eq('turmas.criado_por', profileId)
    .eq('status', 'pendente')
    .order('criado_em');
  if (error) throw error;
  return data;
}

export async function responderPedidoEntradaTurma(pedidoId: string, aprovar: boolean) {
  const { error } = await supabase.rpc('responder_pedido_entrada_turma', {
    p_pedido_id: pedidoId,
    p_aprovar: aprovar,
  });
  if (error) throw error;
}
