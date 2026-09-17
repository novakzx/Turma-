import { supabase } from '@/lib/supabase';

export async function listarEscolas() {
  const { data, error } = await supabase
    .from('escolas')
    .select('id, nome, dominio_email')
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

/**
 * Resolve (ou cria, se ainda não existir) a turma da combinação
 * escola+ano e já matricula o aluno nela — substitui o antigo fluxo de
 * "escolher uma turma existente numa lista" + "pedir entrada" (pedido
 * do usuário: "tira as turmas deixe so o ano escolar mesmo"). RPC
 * `security definer` (ver migration `turma_por_ano_escolar`) porque
 * criar a turma exige a policy de insert de `turmas`, que normalmente
 * amarra `criado_por` a quem chama — aqui a turma nasce sem dono
 * (compartilhada por escola+ano), então precisa rodar com privilégio
 * elevado.
 */
export async function entrarTurmaPorAno(params: {
  escolaId: string;
  serieAno: string;
  numeroCartao: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('entrar_turma_por_ano', {
    p_escola_id: params.escolaId,
    p_serie_ano: params.serieAno,
    p_numero_cartao: params.numeroCartao,
  });
  if (error) throw error;
  return data;
}

/** Turma atual do aluno (só o `serie_ano`) — usada pra pré-selecionar o
 * ano certo ao abrir "trocar de turma" (o perfil só guarda `turma_id`,
 * não o ano em texto). */
export async function buscarSerieAnoDaTurma(turmaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('turmas')
    .select('serie_ano')
    .eq('id', turmaId)
    .maybeSingle();
  if (error) throw error;
  return data?.serie_ano ?? null;
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
