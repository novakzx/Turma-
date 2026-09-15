import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { assinarUrlsEmLote } from '@/lib/storageAssinado';
import { supabase } from '@/lib/supabase';

import type { Apresentacao, SlideComImagem } from './types';

const BUCKET_APRESENTACOES = 'apresentacoes-midia';

// Gerar o plano de texto + até 7 imagens demora bem mais que o chat de
// texto puro (`enviarMensagemChat`, 30s) — generoso o bastante pra não
// cortar antes da IA terminar todas as imagens em paralelo.
const TIMEOUT_GERAR_MS = 60_000;

/**
 * A Edge Function é quem fala com a IA, gera as imagens e grava tudo —
 * o app nunca chama a API de IA direto (regra de ouro do brief, seção
 * 4). Devolve os slides já com o caminho de Storage (não assinado
 * ainda) — quem exibe assina na hora (`buscarApresentacao`).
 */
export async function gerarApresentacao(params: {
  materiaId: string;
  topico: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('gerar-apresentacao', {
    body: { materiaId: params.materiaId, topico: params.topico },
    timeout: TIMEOUT_GERAR_MS,
  });
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data;
}

export async function listarMinhasApresentacoes(alunoId: string): Promise<Apresentacao[]> {
  const { data, error } = await supabase
    .from('apresentacoes')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function buscarApresentacao(
  id: string,
): Promise<{ apresentacao: Apresentacao; slides: SlideComImagem[] }> {
  const { data: apresentacao, error: apresentacaoError } = await supabase
    .from('apresentacoes')
    .select('*')
    .eq('id', id)
    .single();
  if (apresentacaoError) throw apresentacaoError;

  const { data: slides, error: slidesError } = await supabase
    .from('apresentacao_slides')
    .select('*')
    .eq('apresentacao_id', id)
    .order('ordem');
  if (slidesError) throw slidesError;

  const caminhos = slides.flatMap((s) => (s.midia_url ? [s.midia_url] : []));
  const urlsAssinadas = await assinarUrlsEmLote(BUCKET_APRESENTACOES, caminhos);

  return {
    apresentacao,
    slides: slides.map((s) => ({
      ordem: s.ordem,
      titulo: s.titulo,
      topicos: s.topicos,
      imagemUrl: s.midia_url ? (urlsAssinadas.get(s.midia_url) ?? null) : null,
    })),
  };
}

export async function apagarApresentacao(id: string): Promise<void> {
  const { error } = await supabase.from('apresentacoes').delete().eq('id', id);
  if (error) throw error;
}
