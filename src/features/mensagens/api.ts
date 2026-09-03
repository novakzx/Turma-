import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { PerfilResumo } from '@/features/social/types';

import type { Conversa, MensagemDireta, PapelParticipante } from './types';

const SELECT_PERFIL_RESUMO = 'id, nome, nome_usuario, foto_url';

export type ConversaComResumo = Conversa & {
  /** Só preenchido pra `tipo === 'direta'` — o outro participante. */
  outroParticipante: PerfilResumo | null;
  ultimaMensagem: { conteudo: string; criado_em: string } | null;
};

/** Minhas conversas aceitas (não-pendentes) — inbox principal, estilo
 * Instagram "Mensagens" (sem contar "Pedidos", que é uma lista à
 * parte, ver `listarPedidosDeMensagem`). Busca em N+1 de propósito
 * (lista curta pra um MVP; documentado, dá pra otimizar depois). */
export async function listarMinhasConversas(profileId: string): Promise<ConversaComResumo[]> {
  const { data: minhas, error } = await supabase
    .from('conversas_participantes')
    .select('conversa_id, conversas(*)')
    .eq('profile_id', profileId)
    .eq('pedido_aceito', true);
  if (error) throw error;

  const conversas = (minhas as unknown as { conversa_id: string; conversas: Conversa }[])
    .map((l) => l.conversas)
    .filter((c): c is Conversa => !!c);

  return Promise.all(conversas.map((c) => preencherResumo(c, profileId)));
}

/** "Pedidos" (brief seção 8): DM de quem não me segue ainda — a mesma
 * ideia de "solicitações de mensagem" do Instagram. Só existe pra
 * `tipo = 'direta'` (grupo nunca fica pendente, ver migration). */
export async function listarPedidosDeMensagem(profileId: string): Promise<ConversaComResumo[]> {
  const { data: pendentes, error } = await supabase
    .from('conversas_participantes')
    .select('conversa_id, conversas(*)')
    .eq('profile_id', profileId)
    .eq('pedido_aceito', false);
  if (error) throw error;

  const conversas = (pendentes as unknown as { conversa_id: string; conversas: Conversa }[])
    .map((l) => l.conversas)
    .filter((c): c is Conversa => !!c);

  return Promise.all(conversas.map((c) => preencherResumo(c, profileId)));
}

async function preencherResumo(conversa: Conversa, meuId: string): Promise<ConversaComResumo> {
  const [outro, ultima] = await Promise.all([
    conversa.tipo === 'direta'
      ? supabase
          .from('conversas_participantes')
          .select(`profiles(${SELECT_PERFIL_RESUMO})`)
          .eq('conversa_id', conversa.id)
          .neq('profile_id', meuId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('mensagens_diretas')
      .select('conteudo, criado_em')
      .eq('conversa_id', conversa.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    ...conversa,
    outroParticipante:
      (outro?.data as unknown as { profiles: PerfilResumo } | null)?.profiles ?? null,
    ultimaMensagem: ultima?.data ?? null,
  };
}

export async function aceitarPedido(conversaId: string, profileId: string) {
  const { error } = await supabase
    .from('conversas_participantes')
    .update({ pedido_aceito: true })
    .eq('conversa_id', conversaId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

/** Recusar = sair da conversa (apaga só a própria linha de
 * participante) — pra DM 1-a-1, isso efetivamente encerra a conversa
 * dos dois lados quando o outro tentar mandar de novo (RLS de insert
 * exige os dois participantes presentes). */
export async function recusarOuSair(conversaId: string, profileId: string) {
  const { error } = await supabase
    .from('conversas_participantes')
    .delete()
    .eq('conversa_id', conversaId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function criarConversaDireta(outroId: string): Promise<string> {
  const { data, error } = await supabase.rpc('criar_conversa_direta', { p_outro_id: outroId });
  if (error) throw error;
  return data;
}

export async function criarConversaGrupo(
  nome: string,
  participantesIds: string[],
): Promise<string> {
  const { data, error } = await supabase.rpc('criar_conversa_grupo', {
    p_nome: nome,
    p_participantes_ids: participantesIds,
  });
  if (error) throw error;
  return data;
}

export async function adicionarParticipanteGrupo(conversaId: string, novoParticipanteId: string) {
  const { error } = await supabase.rpc('adicionar_participante_grupo', {
    p_conversa_id: conversaId,
    p_novo_participante_id: novoParticipanteId,
  });
  if (error) throw error;
}

export async function buscarConversa(id: string): Promise<Conversa> {
  const { data, error } = await supabase.from('conversas').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export type ParticipanteComPerfil = {
  profile_id: string;
  papel: PapelParticipante;
  pedido_aceito: boolean;
  profiles: PerfilResumo | null;
};

export async function listarParticipantes(conversaId: string): Promise<ParticipanteComPerfil[]> {
  const { data, error } = await supabase
    .from('conversas_participantes')
    .select(`profile_id, papel, pedido_aceito, profiles(${SELECT_PERFIL_RESUMO})`)
    .eq('conversa_id', conversaId);
  if (error) throw error;
  return data as unknown as ParticipanteComPerfil[];
}

export type MensagemComAutor = MensagemDireta & { profiles: PerfilResumo | null };

export async function listarMensagens(conversaId: string): Promise<MensagemComAutor[]> {
  const { data, error } = await supabase
    .from('mensagens_diretas')
    .select(`*, profiles(${SELECT_PERFIL_RESUMO})`)
    .eq('conversa_id', conversaId)
    .order('criado_em')
    .limit(200);
  if (error) throw error;
  return data as unknown as MensagemComAutor[];
}

export async function enviarMensagemDireta(params: {
  conversaId: string;
  autorId: string;
  conteudo: string;
}) {
  const { error } = await supabase.from('mensagens_diretas').insert({
    conversa_id: params.conversaId,
    autor_id: params.autorId,
    conteudo: params.conteudo,
  });
  if (error) throw error;
}

export async function apagarMensagemDireta(id: string) {
  const { error } = await supabase.from('mensagens_diretas').update({ apagada: true }).eq('id', id);
  if (error) throw error;
}

export function assinarMensagensDiretas(conversaId: string, aoMudar: () => void): RealtimeChannel {
  return supabase
    .channel(`mensagens-diretas-${conversaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mensagens_diretas',
        filter: `conversa_id=eq.${conversaId}`,
      },
      aoMudar,
    )
    .subscribe();
}

export async function bloquearUsuario(bloqueadorId: string, bloqueadoId: string) {
  const { error } = await supabase
    .from('bloqueios')
    .insert({ bloqueador_id: bloqueadorId, bloqueado_id: bloqueadoId });
  if (error) throw error;
}

export async function desbloquearUsuario(bloqueadorId: string, bloqueadoId: string) {
  const { error } = await supabase
    .from('bloqueios')
    .delete()
    .eq('bloqueador_id', bloqueadorId)
    .eq('bloqueado_id', bloqueadoId);
  if (error) throw error;
}

export async function euBloqueei(bloqueadorId: string, bloqueadoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bloqueios')
    .select('id')
    .eq('bloqueador_id', bloqueadorId)
    .eq('bloqueado_id', bloqueadoId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
