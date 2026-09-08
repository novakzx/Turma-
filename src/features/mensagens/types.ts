import type { Enums, Tables } from '@/types/database';

export type Conversa = Tables<'conversas'>;
export type ConversaParticipante = Tables<'conversas_participantes'>;
export type MensagemDireta = Tables<'mensagens_diretas'>;
export type TipoConversa = Enums<'tipo_conversa'>;
export type PapelParticipante = Enums<'papel_participante'>;

/** `midia_tipo` não é um enum de banco (é só um `text` com CHECK, ver
 * migration `midia_nos_chats`) — o tipo aqui é decoração, não gerado. */
export type TipoMidiaMensagem = 'imagem' | 'audio';
