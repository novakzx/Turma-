import type { PerfilResumo } from '@/features/social/types';

/** Uma curtida recebida (em post OU story — mesma forma pras duas, pra
 * dar pra mesclar numa lista cronológica só, ver `mesclarCurtidas` em
 * `regras.ts`). `autor` é quem curtiu, não o dono do post/story (que já
 * somos nós, a página só mostra curtidas recebidas). */
export type CurtidaRecebida = {
  id: string;
  criadoEm: string;
  tipo: 'post' | 'story';
  itemId: string;
  autor: PerfilResumo;
};

export type NovoSeguidor = {
  id: string;
  criadoEm: string;
  perfil: PerfilResumo;
};
