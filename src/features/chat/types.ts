import type { Enums, Tables } from '@/types/database';

export type Sala = Tables<'salas_chat'>;
export type MensagemChat = Tables<'mensagens_chat'>;
export type TipoSalaChat = Enums<'tipo_sala_chat'>;

export const ROTULO_TIPO_SALA: Record<TipoSalaChat, string> = {
  turma: 'Turma',
  materia: 'Matéria',
  assunto: 'Assunto livre',
};
