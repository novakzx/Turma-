import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { supabase } from '@/lib/supabase';

import { calcularEstatisticaSemanal, type EstatisticaSemanal } from './regras';
import type { MensagemChatIA, ModoChatEstudo } from './types';

export async function listarHistoricoChat(materiaId: string): Promise<MensagemChatIA[]> {
  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('*')
    .eq('materia_id', materiaId)
    .order('criado_em');
  if (error) throw error;
  return data;
}

/** Só as perguntas (`papel = 'usuario'`) dos últimos 7 dias — a lógica
 * de agregação de verdade (contar matéria diferente, achar o dia mais
 * ativo) fica em `calcularEstatisticaSemanal` (testável sem banco). */
export async function buscarEstatisticaSemanal(alunoId: string): Promise<EstatisticaSemanal> {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('materia_id, criado_em')
    .eq('aluno_id', alunoId)
    .eq('papel', 'usuario')
    .gte('criado_em', seteDiasAtras.toISOString());
  if (error) throw error;

  return calcularEstatisticaSemanal(data);
}

// A Cloudflare Workers AI (provedor de IA atual, ver `chat-estudo/
// index.ts`) responde em poucos segundos na maioria das vezes, mas o
// primeiro uso de um modelo "frio" pode demorar bem mais. Subido de 30s
// pra 45s quando o modo "apresentacao" ganhou geração de imagem por
// slide (a Edge Function gera todas em paralelo, mas ainda soma um
// tempo real de rede/modelo em cima do texto) — 45s é generoso o
// bastante pra cobrir isso sem deixar o botão "Enviar" parecendo
// travado pra sempre se algo realmente engasgar.
const TIMEOUT_CHAT_MS = 45_000;

/**
 * A Edge Function é quem fala com a IA e grava as duas mensagens
 * (usuário + assistente) — o app nunca chama a API de IA direto
 * (regra de ouro do brief, seção 4).
 */
export async function enviarMensagemChat(params: {
  materiaId: string;
  mensagem: string;
  modo: ModoChatEstudo;
}): Promise<{ resposta: string; modelo: string }> {
  const { data, error } = await supabase.functions.invoke('chat-estudo', {
    body: { materiaId: params.materiaId, mensagem: params.mensagem, modo: params.modo },
    timeout: TIMEOUT_CHAT_MS,
  });
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data;
}

const BUCKET_APRESENTACAO_MIDIA = 'apresentacoes-midia';

/** URL assinada (1h, mesmo padrão de `ImagemChat`/`ImagemPost`) pra
 * imagem gerada por IA de um slide (`Slide.imagemCaminho`, ver
 * `regras.ts`). Bucket privado — só o próprio aluno dono da conversa
 * consegue gerar a URL (RLS restringe pelo id dele no path, ver
 * migration `apresentacoes_midia`). */
export async function obterUrlAssinadaApresentacao(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_APRESENTACAO_MIDIA)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
