import type { Enums, Tables } from '@/types/database';

export type Aviso = Tables<'avisos'>;
export type TipoAviso = Enums<'tipo_aviso'>;

export const ROTULO_TIPO_AVISO: Record<TipoAviso, string> = {
  greve: 'Greve',
  feriado: 'Feriado',
  suspensao: 'Suspensão de aula',
  mudanca_horario: 'Mudança de horário',
  prova: 'Prova',
  trabalho: 'Trabalho',
  comunicado: 'Comunicado',
  trajeto: 'Trajeto (clima)',
};

/** Tipos que professor/coordenacao escolhem ao publicar — 'trajeto' é
 * exclusivo do aviso automático de clima, não aparece no formulário. */
export const TIPOS_AVISO_MANUAL: TipoAviso[] = [
  'comunicado',
  'prova',
  'trabalho',
  'mudanca_horario',
  'suspensao',
  'feriado',
  'greve',
];
