import { supabase } from '@/lib/supabase';

import type { Aviso, TipoAviso } from './types';

/**
 * A própria RLS de avisos já escopa o resultado por escola/turma (ver
 * migration inicial) — aqui só ordena pelos mais recentes.
 */
export async function listarAvisos(): Promise<Aviso[]> {
  const { data, error } = await supabase
    .from('avisos')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function criarAviso(params: {
  autorId: string;
  escolaId: string;
  turmaId: string | null;
  tipo: TipoAviso;
  titulo: string;
  descricao: string | null;
  dataEvento: string | null;
}) {
  const { error } = await supabase.from('avisos').insert({
    autor_id: params.autorId,
    escola_id: params.escolaId,
    turma_id: params.turmaId,
    tipo: params.tipo,
    titulo: params.titulo,
    descricao: params.descricao,
    data_evento: params.dataEvento,
  });
  if (error) throw error;
}
