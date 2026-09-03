import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

import type { Post, PostComentario, TipoConteudoDenuncia, TipoPost } from './types';

const BUCKET_MIDIA = 'posts-midia';

export type PostComContadores = Post & {
  profiles: { nome: string } | null;
  post_curtidas: { count: number }[];
  post_comentarios: { count: number }[];
};

const SELECT_POST_COM_CONTADORES =
  '*, profiles(nome), post_curtidas(count), post_comentarios(count)';

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

export async function escolherImagem(): Promise<string | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return null;

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  return resultado.assets[0].uri;
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
