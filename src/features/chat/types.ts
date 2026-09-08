import type { Ionicons } from '@expo/vector-icons';

import type { Enums, Tables } from '@/types/database';

export type Sala = Tables<'salas_chat'>;
export type MensagemChat = Tables<'mensagens_chat'>;
export type TipoSalaChat = Enums<'tipo_sala_chat'>;

export const ROTULO_TIPO_SALA: Record<TipoSalaChat, string> = {
  turma: 'Turma',
  materia: 'Matéria',
  assunto: 'Assunto livre',
};

export const ICONE_TIPO_SALA: Record<TipoSalaChat, keyof typeof Ionicons.glyphMap> = {
  turma: 'people',
  materia: 'book',
  assunto: 'bulb',
};

/** `midia_tipo` não é um enum de banco (é só um `text` com CHECK, ver
 * migration `midia_nos_chats`) — o tipo aqui é decoração, não gerado. */
export type TipoMidiaMensagem = 'imagem' | 'audio';
