import type { Ionicons } from '@expo/vector-icons';

import type { Enums, Tables } from '@/types/database';

export type Post = Tables<'posts'>;
export type PostComentario = Tables<'post_comentarios'>;
export type TipoPost = Enums<'tipo_post'>;
export type TipoConteudoDenuncia = Enums<'tipo_conteudo_denuncia'>;

export const ROTULO_TIPO_POST: Record<TipoPost, string> = {
  texto: 'Texto',
  foto: 'Foto',
  evento: 'Evento',
  lembrete: 'Lembrete',
};

export const ICONE_TIPO_POST: Record<TipoPost, keyof typeof Ionicons.glyphMap> = {
  texto: 'chatbox-outline',
  foto: 'image',
  evento: 'calendar',
  lembrete: 'alarm',
};
