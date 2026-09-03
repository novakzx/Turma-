import type { Profile } from '@/features/auth/types';

export type DadosEdicaoPerfil = Pick<Profile, 'nome' | 'nome_usuario' | 'bio'>;
