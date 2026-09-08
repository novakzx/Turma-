import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

import { calcularResultadoEnquete, type ResultadoEnquete } from './regras';
import type { Post, PostComentario, TipoConteudoDenuncia, TipoPost } from './types';

const BUCKET_MIDIA = 'posts-midia';

export type PostComContadores = Post & {
  profiles: { id: string; nome: string; foto_url: string | null } | null;
  post_curtidas: { count: number }[];
  post_comentarios: { count: number }[];
};

const SELECT_POST_COM_CONTADORES =
  '*, profiles(id, nome, foto_url), post_curtidas(count), post_comentarios(count)';

/** RLS já restringe a `turma_id` própria (ou escola inteira pra
 * coordenacao) — aqui só ordena e traz as contagens junto, num round-trip
 * só (brief 6.4: curtir e comentar, sem seguir/repost). */
export async function listarPosts(turmaId: string): Promise<PostComContadores[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT_POST_COM_CONTADORES)
    .eq('turma_id', turmaId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as PostComContadores[];
}

/** "Ver as publicações" no perfil (brief da Fase 6+: perfil editável) —
 * mesmo formato de post-com-contadores do feed da turma, só que filtrado
 * por autor em vez de turma. RLS de `posts` já restringe à turma/escola
 * de quem está olhando, então isso nunca vaza post de fora do alcance
 * de quem está vendo o perfil. */
export async function listarPostsDoAutor(autorId: string): Promise<PostComContadores[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT_POST_COM_CONTADORES)
    .eq('autor_id', autorId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as PostComContadores[];
}

export async function buscarPost(postId: string): Promise<PostComContadores> {
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT_POST_COM_CONTADORES)
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data as unknown as PostComContadores;
}

/** Quais desses posts o próprio usuário já curtiu — pra pintar o botão de
 * curtida corretamente sem uma query por post. */
export async function listarMeusLikes(postIds: string[], autorId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('post_curtidas')
    .select('post_id')
    .eq('autor_id', autorId)
    .in('post_id', postIds);
  if (error) throw error;
  return new Set(data.map((d) => d.post_id));
}

export async function curtir(postId: string, autorId: string) {
  const { error } = await supabase
    .from('post_curtidas')
    .insert({ post_id: postId, autor_id: autorId });
  if (error) throw error;
}

export async function descurtir(postId: string, autorId: string) {
  const { error } = await supabase
    .from('post_curtidas')
    .delete()
    .eq('post_id', postId)
    .eq('autor_id', autorId);
  if (error) throw error;
}

export async function criarPost(params: {
  autorId: string;
  turmaId: string;
  tipo: TipoPost;
  conteudo: string | null;
  midiaUrl: string | null;
  dataEvento: string | null;
}) {
  const { error } = await supabase.from('posts').insert({
    autor_id: params.autorId,
    turma_id: params.turmaId,
    tipo: params.tipo,
    conteudo: params.conteudo,
    midia_url: params.midiaUrl,
    data_evento: params.dataEvento,
  });
  if (error) throw error;
}

export async function apagarPost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

/**
 * Enquete rápida (pedido do usuário): post tipo `enquete` com 2-4
 * opções fixas, criadas junto na hora — imutáveis depois (sem editar
 * opção de enquete já publicada, "comece simples"). `conteudo` do post
 * é a própria pergunta.
 */
export async function criarEnquete(params: {
  autorId: string;
  turmaId: string;
  pergunta: string;
  opcoes: string[];
}) {
  const { data: post, error: erroPost } = await supabase
    .from('posts')
    .insert({
      autor_id: params.autorId,
      turma_id: params.turmaId,
      tipo: 'enquete',
      conteudo: params.pergunta,
    })
    .select('id')
    .single();
  if (erroPost) throw erroPost;

  const { error: erroOpcoes } = await supabase.from('post_enquete_opcoes').insert(
    params.opcoes.map((texto, ordem) => ({
      post_id: post.id,
      texto: texto.trim(),
      ordem,
    })),
  );
  if (erroOpcoes) throw erroOpcoes;
}

export type OpcaoEnquete = { id: string; texto: string; ordem: number };

export type EnqueteComVotos = ResultadoEnquete & { opcoes: OpcaoEnquete[] };

/** Volume de votos por post é pequeno (tamanho de turma, dezenas de
 * alunos no máximo) — traz todos os votos e agrega no cliente
 * (`calcularResultadoEnquete`, regras.ts) em vez de precisar de uma
 * consulta agregada separada. */
export async function buscarEnquete(postId: string, votanteId: string): Promise<EnqueteComVotos> {
  const [opcoesResp, votosResp] = await Promise.all([
    supabase
      .from('post_enquete_opcoes')
      .select('id, texto, ordem')
      .eq('post_id', postId)
      .order('ordem'),
    supabase.from('post_enquete_votos').select('opcao_id, votante_id').eq('post_id', postId),
  ]);
  if (opcoesResp.error) throw opcoesResp.error;
  if (votosResp.error) throw votosResp.error;

  const opcoes = opcoesResp.data ?? [];
  const votos = votosResp.data ?? [];

  return { opcoes, ...calcularResultadoEnquete(opcoes, votos, votanteId) };
}

/** Upsert em vez de insert/update separados — deixa trocar de voto sem
 * o cliente precisar saber se já votou antes (RLS já garante que só o
 * próprio voto pode ser alterado e que a opção pertence de fato a essa
 * enquete, ver migration `enquetes_no_feed`). */
export async function votarEnquete(params: { postId: string; opcaoId: string; votanteId: string }) {
  const { error } = await supabase
    .from('post_enquete_votos')
    .upsert(
      { post_id: params.postId, opcao_id: params.opcaoId, votante_id: params.votanteId },
      { onConflict: 'post_id,votante_id' },
    );
  if (error) throw error;
}

export type ComentarioComAutor = PostComentario & { profiles: { nome: string } | null };

export async function listarComentarios(postId: string): Promise<ComentarioComAutor[]> {
  const { data, error } = await supabase
    .from('post_comentarios')
    .select('*, profiles(nome)')
    .eq('post_id', postId)
    .order('criado_em');
  if (error) throw error;
  return data as unknown as ComentarioComAutor[];
}

export async function criarComentario(params: {
  postId: string;
  autorId: string;
  conteudo: string;
}) {
  const { error } = await supabase
    .from('post_comentarios')
    .insert({ post_id: params.postId, autor_id: params.autorId, conteudo: params.conteudo });
  if (error) throw error;
}

export async function apagarComentario(id: string) {
  const { error } = await supabase.from('post_comentarios').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Bucket privado (brief seção 7: dado de menor de idade, nada de link
 * público adivinhável) — devolve só o *caminho* do arquivo. Pra exibir a
 * imagem, gera uma URL assinada com validade curta (`obterUrlAssinada`).
 *
 * A extensão vem do `content-type` do blob buscado, não da URI local: no
 * nativo `uriLocal` é um `file://...jpg`, mas no web o image picker devolve
 * um `blob:http://...` sem ponto nenhum — tentar cortar por "." ali gravava
 * a URL inteira (com ":" e "/") como "extensão" e quebrava o nome do
 * arquivo no Storage.
 */
export async function fazerUploadImagemPost(turmaId: string, uriLocal: string): Promise<string> {
  const resposta = await fetch(uriLocal);
  const arrayBuffer = await resposta.arrayBuffer();
  const contentType = resposta.headers.get('content-type') ?? 'image/jpeg';
  const extensao = contentType.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
  const caminho = `${turmaId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_MIDIA).upload(caminho, arrayBuffer, {
    contentType,
  });
  if (error) throw error;
  return caminho;
}

export async function obterUrlAssinada(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_MIDIA)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Sem permissão negada não dá pra distinguir de "usuário cancelou" só
 * olhando pro retorno — as duas viravam `null` antes, e o botão
 * "Escolher foto" parecia simplesmente não fazer nada quando a
 * permissão tinha sido negada (achado testando de verdade: pedido do
 * usuário "não dá pra adicionar fotos" nas stories era exatamente
 * isso). Agora permissão negada lança erro de verdade — cancelar
 * continua silencioso, é a única distinção que interessa pro
 * usuário. */
export async function escolherImagem(): Promise<string | null> {
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
  return resultado.assets[0].uri;
}

export type MidiaEscolhida = { uri: string; tipoMidia: 'foto' | 'video' };

/** Igual `escolherImagem`, mas libera vídeo também — usado nas
 * stories (pedido do usuário: "story não dá pra adicionar fotos nem
 * vídeos"; foto já funcionava, vídeo nunca tinha sido implementado
 * mesmo). `tipoMidia` vem do `resultado.assets[0].type` do próprio
 * picker, que já distingue foto de vídeo — não precisa adivinhar pela
 * extensão do arquivo. */
export async function escolherFotoOuVideo(): Promise<MidiaEscolhida | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error(
      'Sem permissão pra acessar suas fotos/vídeos. Ative o acesso nas configurações do dispositivo/navegador e tente de novo.',
    );
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.7,
    videoMaxDuration: 60,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const asset = resultado.assets[0];
  return { uri: asset.uri, tipoMidia: asset.type === 'video' ? 'video' : 'foto' };
}

export async function denunciar(params: {
  tipoConteudo: TipoConteudoDenuncia;
  conteudoId: string;
  denuncianteId: string;
  escolaId: string;
  motivo: string;
}) {
  const { error } = await supabase.from('denuncias').insert({
    tipo_conteudo: params.tipoConteudo,
    conteudo_id: params.conteudoId,
    denunciante_id: params.denuncianteId,
    escola_id: params.escolaId,
    motivo: params.motivo,
  });
  if (error) throw error;
}
