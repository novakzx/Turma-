import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { lerBytesDeMidiaLocal } from '@/lib/lerMidiaLocal';
import { assinarUrlsEmLote } from '@/lib/storageAssinado';
import { supabase } from '@/lib/supabase';

import { calcularEstatisticaSemanal, type EstatisticaSemanal } from './regras';
import type { MensagemChatIA, ModoChatEstudo } from './types';

// Bucket privado próprio (não reusa `posts-midia`/`perfil-fotos`, ver
// migration `estudo_fotos_anotacao`) — mais restrito que os dois: isto é
// a anotação/caderno do aluno, não algo social, então só o próprio
// aluno pode ver a própria foto (nunca colega de turma, nunca staff).
const BUCKET_FOTOS_ESTUDO = 'estudo-fotos';

export type MensagemChatIAComUrl = MensagemChatIA & {
  /** URL já assinada em lote — ver comentário abaixo. */
  urlMidiaAssinada?: string | null;
};

/** Achado do usuário ("demora pra carregar as imagens"): mesmo N+1 de
 * assinatura já corrigido no feed/salas/DMs — `<MiniaturaFoto>` pedia a
 * própria URL sozinha por mensagem. */
export async function listarHistoricoChat(materiaId: string): Promise<MensagemChatIAComUrl[]> {
  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('*')
    .eq('materia_id', materiaId)
    .order('criado_em');
  if (error) throw error;

  const caminhosFoto = data.filter((m) => m.midia_url).map((m) => m.midia_url as string);
  const urls = await assinarUrlsEmLote(BUCKET_FOTOS_ESTUDO, caminhosFoto);

  return data.map((m) => ({
    ...m,
    urlMidiaAssinada: m.midia_url ? (urls.get(m.midia_url) ?? null) : null,
  }));
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

// Teto generoso (~13 meses) só pra não deixar a query crescer sem fim
// pra quem usa o app há muito tempo -- sequência de estudos de verdade
// nunca chega nem perto disso na prática, e o cálculo (`calcularSequenciaEstudos`)
// já para sozinho no primeiro buraco de qualquer forma.
const JANELA_SEQUENCIA_DIAS = 400;

/** Datas (`criado_em`) das perguntas do aluno -- a contagem de dias
 * seguidos de verdade fica em `calcularSequenciaEstudos` (testável sem
 * banco). Recurso Premium (pedido do usuário), mas o gate de "só
 * assinante vê" fica na UI -- aqui é só a consulta. */
export async function buscarDiasComAtividade(alunoId: string): Promise<string[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - JANELA_SEQUENCIA_DIAS);

  const { data, error } = await supabase
    .from('chat_ia_mensagens')
    .select('criado_em')
    .eq('aluno_id', alunoId)
    .eq('papel', 'usuario')
    .gte('criado_em', desde.toISOString());
  if (error) throw error;

  return (data ?? []).map((m) => m.criado_em);
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

// BUG real relatado pelo usuário ("ta dando que a imagem e grande de
// mais"): o código anterior só comprimia (`quality: 0.7` do picker) mas
// nunca REDIMENSIONAVA — uma foto de celular moderno (12MP+) continua
// passando fácil de 3-4 MB mesmo comprimida, estourando o teto de 2 MB
// da Edge Function (`FOTO_TAMANHO_MAXIMO_BYTES`, ver `chat-estudo/
// index.ts`) quase sempre. 1600px no lado maior é generoso o bastante
// pra manter texto/número legível pro modelo de visão, mas já reduz o
// arquivo pra uma fração do tamanho original — depois de redimensionar
// e comprimir de novo (JPEG, 0.7), uma foto de caderno fica na casa dos
// 150-400 KB, bem abaixo do teto.
const LARGURA_MAXIMA_FOTO = 1600;

/** `base64` só é pedido no **web**: depois de redimensionar, a uri nova
 * seria um `blob:` criado pela própria página — o mesmo tipo de blob
 * que o Safari às vezes recusa fazer `fetch()` (bug documentado em
 * `lerMidiaLocal.ts`). Pedir o base64 direto do `saveAsync` evita esse
 * fetch inteiramente. No **nativo**, a uri nova já é um `file://` de
 * verdade — `fetch()` nela é seguro (mesmo padrão já testado em
 * `lerBytesDeMidiaLocal`), então não precisa carregar a imagem inteira
 * duas vezes na memória com base64. */
export type FotoEscolhida = { uri: string; base64: string | null };

export async function escolherFotoAnotacao(): Promise<FotoEscolhida | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error(
      'Sem permissão pra acessar suas fotos. Ative o acesso nas configurações do dispositivo/navegador e tente de novo.',
    );
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const asset = resultado.assets[0];

  const contexto = ImageManipulator.manipulate(asset.uri);
  // BUG real relatado pelo usuário ("The index is not in the allowed
  // range" ao anexar foto no PWA/iPhone): `height: null` (deixar a lib
  // calcular a proporção sozinha) funciona no nativo, mas a
  // implementação WEB do `expo-image-manipulator` usa `<canvas>` por
  // baixo — passar altura `null`/inválida pro `drawImage` do canvas
  // lança `IndexSizeError: The index is not in the allowed range`
  // (bug conhecido da lib no alvo web, não documentado pela Expo).
  // Corrigido calculando a altura à mão a partir da proporção original
  // (`asset.width`/`height`, que o picker já devolve) — só
  // redimensiona se a foto for maior que o alvo E o picker informou
  // dimensão de verdade (pode vir `0` se o sistema não informar, nesse
  // caso só comprime sem redimensionar em vez de arriscar quebrar).
  if (asset.width > 0 && asset.width > LARGURA_MAXIMA_FOTO) {
    const alturaProporcional = Math.round(asset.height * (LARGURA_MAXIMA_FOTO / asset.width));
    contexto.resize({ width: LARGURA_MAXIMA_FOTO, height: alturaProporcional });
  }
  const renderizada = await contexto.renderAsync();
  const salva = await renderizada.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: Platform.OS === 'web',
  });

  return { uri: salva.uri, base64: salva.base64 ?? null };
}

function base64ParaArrayBuffer(base64: string): ArrayBuffer {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

/** Upload pro bucket privado `estudo-fotos`, path "{aluno_id}/arquivo.jpg"
 * (sempre jpg — `escolherFotoAnotacao` já converte pra isso no
 * redimensionamento, então não precisa mais derivar a extensão do
 * content-type real do blob como `fazerUploadImagemPost` faz). Devolve
 * só o caminho; a URL assinada é gerada na hora de exibir
 * (`obterUrlAssinadaFotoEstudo`). */
export async function fazerUploadFotoAnotacao(
  alunoId: string,
  foto: FotoEscolhida,
): Promise<string> {
  const { arrayBuffer } = foto.base64
    ? { arrayBuffer: base64ParaArrayBuffer(foto.base64) }
    : await lerBytesDeMidiaLocal(foto.uri, null);
  const caminho = `${alunoId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

  const { error } = await supabase.storage.from(BUCKET_FOTOS_ESTUDO).upload(caminho, arrayBuffer, {
    contentType: 'image/jpeg',
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
