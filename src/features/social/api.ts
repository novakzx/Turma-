import { lerBytesDeMidiaLocal } from '@/lib/lerMidiaLocal';
import { supabase } from '@/lib/supabase';

import type { PerfilPublico, PerfilResumo, StoryComAutor } from './types';

const BUCKET_STORIES = 'stories-midia';

const SELECT_PERFIL_RESUMO = 'id, nome, nome_usuario, foto_url';

export async function seguir(seguidorId: string, seguidoId: string) {
  const { error } = await supabase
    .from('seguidores')
    .insert({ seguidor_id: seguidorId, seguido_id: seguidoId });
  if (error) throw error;
}

export async function deixarDeSeguir(seguidorId: string, seguidoId: string) {
  const { error } = await supabase
    .from('seguidores')
    .delete()
    .eq('seguidor_id', seguidorId)
    .eq('seguido_id', seguidoId);
  if (error) throw error;
}

export async function estaSeguindo(seguidorId: string, seguidoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('seguidores')
    .select('id')
    .eq('seguidor_id', seguidorId)
    .eq('seguido_id', seguidoId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Contadores pro cabeçalho estilo Instagram (Publicações/Seguidores/
 * Seguindo) — três `count: 'exact', head: true` em paralelo, sem trazer
 * linha nenhuma de volta. */
export async function contarConexoes(
  profileId: string,
): Promise<{ seguidores: number; seguindo: number }> {
  const [seguidores, seguindo] = await Promise.all([
    supabase
      .from('seguidores')
      .select('id', { count: 'exact', head: true })
      .eq('seguido_id', profileId),
    supabase
      .from('seguidores')
      .select('id', { count: 'exact', head: true })
      .eq('seguidor_id', profileId),
  ]);
  if (seguidores.error) throw seguidores.error;
  if (seguindo.error) throw seguindo.error;
  return { seguidores: seguidores.count ?? 0, seguindo: seguindo.count ?? 0 };
}

export async function listarSeguidores(profileId: string): Promise<PerfilResumo[]> {
  const { data, error } = await supabase
    .from('seguidores')
    .select(`profiles!seguidores_seguidor_id_fkey(${SELECT_PERFIL_RESUMO})`)
    .eq('seguido_id', profileId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data as unknown as { profiles: PerfilResumo }[])
    .map((linha) => linha.profiles)
    .filter((p): p is PerfilResumo => !!p);
}

export async function listarSeguindo(profileId: string): Promise<PerfilResumo[]> {
  const { data, error } = await supabase
    .from('seguidores')
    .select(`profiles!seguidores_seguido_id_fkey(${SELECT_PERFIL_RESUMO})`)
    .eq('seguidor_id', profileId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data as unknown as { profiles: PerfilResumo }[])
    .map((linha) => linha.profiles)
    .filter((p): p is PerfilResumo => !!p);
}

/** Perfil de qualquer usuário (não só o próprio). RLS de `profiles`
 * decide se essa linha existe pra quem está olhando (`publico = true`,
 * mesma turma/escola, staff, ou é o próprio dono) — sem acesso, o
 * `.single()` simplesmente não acha nada e lança, tratado como "perfil
 * não encontrado" na tela. */
export async function buscarPerfilPublico(id: string): Promise<PerfilPublico> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, nome_usuario, foto_url, bio, link, papel, publico, turma_id')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Stories ativas de qualquer conta do app (RLS só filtra por
 * expiração — pedido do usuário, ver migration
 * `feed_stories_visivel_para_todos`), agrupadas por autor no componente
 * — aqui só traz a lista crua ordenada, mais recente primeiro. */
export async function listarStoriesVisiveis(): Promise<StoryComAutor[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(`*, profiles(${SELECT_PERFIL_RESUMO})`)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as StoryComAutor[];
}

export async function listarStoriesDoAutor(autorId: string): Promise<StoryComAutor[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(`*, profiles(${SELECT_PERFIL_RESUMO})`)
    .eq('autor_id', autorId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return data as unknown as StoryComAutor[];
}

export async function criarStory(autorId: string, midiaUrl: string) {
  const { error } = await supabase
    .from('stories')
    .insert({ autor_id: autorId, midia_url: midiaUrl });
  if (error) throw error;
}

export async function apagarStory(id: string) {
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw error;
}

/** Mesmo racional de `fazerUploadImagemPost`: extensão vem do
 * content-type da resposta (não da URI — no web o image picker devolve
 * `blob:http://...` sem ponto nenhum). Path começa com o autor_id, não
 * com turma (story é visível também pra quem segue de fora da turma). */
/** Nome mantido por compatibilidade, mas funciona pra foto OU vídeo —
 * o `content-type`/extensão vêm do próprio blob buscado, não é
 * assumido nada aqui (mesma função serve pros dois desde que o
 * usuário possa escolher vídeo na story, ver `escolherFotoOuVideo`). */
export async function fazerUploadImagemStory(
  autorId: string,
  uriLocal: string,
  arquivoWeb?: File | null,
): Promise<string> {
  const { arrayBuffer, contentType } = await lerBytesDeMidiaLocal(uriLocal, arquivoWeb);
  const extensao = contentType.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
  const caminho = `${autorId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_STORIES).upload(caminho, arrayBuffer, {
    contentType,
  });
  if (error) throw error;
  return caminho;
}

export async function obterUrlAssinadaStory(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_STORIES)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
