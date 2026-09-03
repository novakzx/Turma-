import type { Enums, Tables } from '@/types/database';

export type Conversa = Tables<'conversas'>;
export type ConversaParticipante = Tables<'conversas_participantes'>;
export type MensagemDireta = Tables<'mensagens_diretas'>;
export type TipoConversa = Enums<'tipo_conversa'>;
export type PapelParticipante = Enums<'papel_participante'>;
