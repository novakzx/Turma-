import type { Enums, Tables } from '@/types/database';

export type Denuncia = Tables<'denuncias'>;
export type TipoConteudoDenuncia = Enums<'tipo_conteudo_denuncia'>;
export type StatusDenuncia = Enums<'status_denuncia'>;

export const ROTULO_TIPO_CONTEUDO: Record<TipoConteudoDenuncia, string> = {
  post: 'Post',
  comentario: 'Comentário',
  mensagem: 'Mensagem de sala',
  mensagem_direta: 'Mensagem direta',
};

export const ROTULO_STATUS_DENUNCIA: Record<StatusDenuncia, string> = {
  pendente: 'Pendente',
  revisado: 'Revisado',
  resolvido: 'Resolvido',
};
