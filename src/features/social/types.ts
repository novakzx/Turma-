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
  papel: Tables<'profiles'>['papel'];
  publico: boolean;
  turma_id: string | null;
};

export type StoryComAutor = Story & { profiles: PerfilResumo | null };
