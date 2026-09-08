import { lerBytesDeMidiaLocal } from '@/lib/lerMidiaLocal';
import { supabase } from '@/lib/supabase';

const BUCKET_FOTOS = 'perfil-fotos';

/** Turma + nome da escola, pra mostrar na home depois do onboarding. */
export async function buscarTurmaComEscola(turmaId: string) {
  const { data, error } = await supabase
    .from('turmas')
    .select('nome, serie_ano, escolas(nome)')
    .eq('id', turmaId)
    .single();
  if (error) throw error;
  return data;
}

/** Nome, foto, nome de usuário e bio são as únicas colunas que o próprio
 * dono pode editar aqui (GRANT restrito — ver migration inicial e
 * `perfil_editavel`). `nomeUsuario`/`fotoUrl` vazios viram `null` (dá pra
 * "tirar" o @ escolhido ou a foto). Um único UPDATE — nunca um estado
 * "só a foto salvou, o resto não". */
export async function atualizarPerfil(params: {
  id: string;
  nome: string;
  nomeUsuario: string | null;
  bio: string | null;
  link: string | null;
  fotoUrl?: string | null;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({
      nome: params.nome,
      nome_usuario: params.nomeUsuario,
      bio: params.bio,
      link: params.link,
      ...(params.fotoUrl !== undefined ? { foto_url: params.fotoUrl } : {}),
    })
    .eq('id', params.id);
  if (error) throw error;
}

/**
 * Bucket privado (mesmo racional do `posts-midia`: foto de menor de
 * idade não pode ter link público adivinhável). Path fixo por usuário
 * (`{userId}/avatar.<ext>`, `upsert: true`) — trocar a foto sobrescreve
 * a anterior em vez de acumular arquivo órfão no Storage.
 */
export async function fazerUploadFotoPerfil(
  userId: string,
  uriLocal: string,
  arquivoWeb?: File | null,
): Promise<string> {
  const { arrayBuffer, contentType } = await lerBytesDeMidiaLocal(uriLocal, arquivoWeb);
  const extensao = contentType.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
  const caminho = `${userId}/avatar.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, arrayBuffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return caminho;
}

/** Configurações: público (padrão) = perfil vê quem quiser; privado
 * restringe pra quem já enxergaria pelas regras de sempre (turma/escola,
 * staff). Fase 10/13 aplicam a restrição de verdade na busca global de
 * usuário — aqui só grava a preferência. */
export async function atualizarPrivacidade(id: string, publico: boolean) {
  const { error } = await supabase.from('profiles').update({ publico }).eq('id', id);
  if (error) throw error;
}

export async function obterUrlAssinadaFoto(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
