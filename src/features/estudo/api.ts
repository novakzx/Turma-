import * as ImagePicker from 'expo-image-picker';

import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { lerBytesDeMidiaLocal } from '@/lib/lerMidiaLocal';
import { supabase } from '@/lib/supabase';

import { calcularEstatisticaSemanal, type EstatisticaSemanal } from './regras';
import type { MensagemChatIA, ModoChatEstudo } from './types';

// Bucket privado próprio (não reusa `posts-midia`/`perfil-fotos`, ver
// migration `estudo_fotos_anotacao`) — mais restrito que os dois: isto é
// a anotação/caderno do aluno, não algo social, então só o próprio
// aluno pode ver a própria foto (nunca colega de turma, nunca staff).
const BUCKET_FOTOS_ESTUDO = 'estudo-fotos';

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
// primeiro uso de um modelo "frio" pode demorar bem mais — 30s é
// generoso o bastante pra cobrir isso sem deixar o botão "Enviar"
// parecendo travado pra sempre se algo realmente engasgar.
const TIMEOUT_CHAT_MS = 30_000;

/**
 * A Edge Function é quem fala com a IA e grava as duas mensagens
 * (usuário + assistente) — o app nunca chama a API de IA direto
 * (regra de ouro do brief, seção 4).
 *
 * `fotoCaminho` (pedido do usuário — "pra ia ver fotos das anotacoes
 * dos alunos") é o caminho já enviado ao bucket `estudo-fotos`
 * (`fazerUploadFotoAnotacao`), nunca a imagem em si — a Edge Function
 * busca os bytes direto do Storage com a service role antes de mandar
 * pro modelo de visão.
 */
export async function enviarMensagemChat(params: {
  materiaId: string;
  mensagem: string;
  modo: ModoChatEstudo;
  fotoCaminho?: string | null;
}): Promise<{ resposta: string; modelo: string }> {
  const { data, error } = await supabase.functions.invoke('chat-estudo', {
    body: {
      materiaId: params.materiaId,
      mensagem: params.mensagem,
      modo: params.modo,
      fotoCaminho: params.fotoCaminho ?? undefined,
    },
    // Foto demora mais que texto puro pra processar (modelo de visão é
    // mais pesado) — dobra o teto em vez de arriscar cortar antes da
    // IA terminar de "olhar" a imagem.
    timeout: params.fotoCaminho ? TIMEOUT_CHAT_MS * 2 : TIMEOUT_CHAT_MS,
  });
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  return data;
}

/** Igual `escolherImagem` de `feed/api.ts` (duplicado de propósito —
 * mesmo padrão de bucket/constante já duplicado neste projeto, ver
 * comentário em `BUCKET_FOTOS_ESTUDO`). `quality: 0.7`, igual ao de
 * post — a Edge Function manda a foto pro modelo de visão como array
 * de bytes (não base64, ver `chat-estudo/index.ts`), que infla bem mais
 * em JSON; comprimir direito no cliente ajuda a foto inteira caber no
 * teto de tamanho de lá sem cortar nitidez a ponto de a IA não conseguir
 * ler o texto. */
export type FotoEscolhida = { uri: string; arquivoWeb: File | null };

export async function escolherFotoAnotacao(): Promise<FotoEscolhida | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error(
      'Sem permissão pra acessar suas fotos. Ative o acesso nas configurações do dispositivo/navegador e tente de novo.',
    );
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const asset = resultado.assets[0];
  return { uri: asset.uri, arquivoWeb: asset.file ?? null };
}

/** Upload pro bucket privado `estudo-fotos`, path "{aluno_id}/arquivo.ext"
 * (mesmo racional de `fazerUploadImagemPost`: extensão vem do
 * `content-type` real do blob, nunca cortando a URI local por "." —
 * no web isso é um `blob:...` sem ponto nenhum). Devolve só o caminho;
 * a URL assinada é gerada na hora de exibir (`obterUrlAssinadaFotoEstudo`). */
export async function fazerUploadFotoAnotacao(
  alunoId: string,
  uriLocal: string,
  arquivoWeb?: File | null,
): Promise<string> {
  const { arrayBuffer, contentType } = await lerBytesDeMidiaLocal(uriLocal, arquivoWeb);
  const extensao = contentType.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
  const caminho = `${alunoId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_FOTOS_ESTUDO).upload(caminho, arrayBuffer, {
    contentType,
  });
  if (error) throw error;
  return caminho;
}

export async function obterUrlAssinadaFotoEstudo(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS_ESTUDO)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
