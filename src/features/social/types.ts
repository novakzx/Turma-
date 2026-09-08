import type { Tables } from '@/types/database';

export type Seguidor = Tables<'seguidores'>;
export type Story = Tables<'stories'>;

export type PerfilResumo = {
  id: string;
  nome: string;
  nome_usuario: string | null;
  foto_url: string | null;
};

export type PerfilPublico = PerfilResumo & {
  bio: string | null;
  link: string | null;
  papel: Tables<'profiles'>['papel'];
  publico: boolean;
  turma_id: string | null;
  assinatura_ativa: boolean;
};

export type StoryComAutor = Story & { profiles: PerfilResumo | null };

const EXTENSOES_VIDEO = ['mp4', 'mov', 'webm', 'm4v', 'avi', '3gp'];

/** Story não tem coluna de tipo — dá pra saber se é vídeo ou foto só
 * pela extensão do arquivo (gravada por `fazerUploadImagemStory` a
 * partir do content-type real do blob, então é confiável). */
export function ehVideo(caminho: string): boolean {
  const extensao = caminho.split('.').pop()?.toLowerCase();
  return !!extensao && EXTENSOES_VIDEO.includes(extensao);
}
