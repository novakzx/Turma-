import { supabase } from '@/lib/supabase';

import type { Denuncia, StatusDenuncia, TipoConteudoDenuncia } from './types';

export async function listarDenuncias(
  escolaId: string,
  status?: StatusDenuncia,
): Promise<Denuncia[]> {
  let query = supabase
    .from('denuncias')
    .select('*')
    .eq('escola_id', escolaId)
    .order('criado_em', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function atualizarStatusDenuncia(id: string, status: StatusDenuncia) {
  const { error } = await supabase.from('denuncias').update({ status }).eq('id', id);
  if (error) throw error;
}

export type ConteudoDenunciado = {
  conteudo: string | null;
  autorNome: string | null;
};

/** Busca o texto do conteúdo denunciado pra staff revisar (brief seção
 * 7/12: "staff/coordenação com visibilidade de conteúdo denunciado").
 * `mensagem_direta` só retorna algo aqui porque a RLS de
 * `mensagens_diretas` libera especificamente a mensagem que tem uma
 * denúncia apontando pra ela (nunca a conversa inteira) — ver
 * migration `mensagens_diretas_bloqueio`. `null` quando o conteúdo já
 * foi apagado (post/comentário apagado de verdade, mensagem com soft
 * delete) — mostrado como "conteúdo não disponível" na tela. */
export async function buscarConteudoDenunciado(
  tipo: TipoConteudoDenuncia,
  conteudoId: string,
): Promise<ConteudoDenunciado> {
  switch (tipo) {
    case 'post': {
      const { data } = await supabase
        .from('posts')
        .select('conteudo, profiles(nome)')
        .eq('id', conteudoId)
        .maybeSingle();
      return {
        conteudo: data?.conteudo ?? null,
        autorNome: (data?.profiles as unknown as { nome: string } | null)?.nome ?? null,
      };
    }
    case 'comentario': {
      const { data } = await supabase
        .from('post_comentarios')
        .select('conteudo, profiles(nome)')
        .eq('id', conteudoId)
        .maybeSingle();
      return {
        conteudo: data?.conteudo ?? null,
        autorNome: (data?.profiles as unknown as { nome: string } | null)?.nome ?? null,
      };
    }
    case 'mensagem': {
      const { data } = await supabase
        .from('mensagens_chat')
        .select('conteudo, apagada, profiles(nome)')
        .eq('id', conteudoId)
        .maybeSingle();
      return {
        conteudo: data && !data.apagada ? data.conteudo : null,
        autorNome: (data?.profiles as unknown as { nome: string } | null)?.nome ?? null,
      };
    }
    case 'mensagem_direta': {
      const { data } = await supabase
        .from('mensagens_diretas')
        .select('conteudo, apagada, profiles(nome)')
        .eq('id', conteudoId)
        .maybeSingle();
      return {
        conteudo: data && !data.apagada ? data.conteudo : null,
        autorNome: (data?.profiles as unknown as { nome: string } | null)?.nome ?? null,
      };
    }
  }
}
