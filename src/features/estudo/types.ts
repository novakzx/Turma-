import type { Ionicons } from '@expo/vector-icons';

import type { Tables } from '@/types/database';

export type MensagemChatIA = Tables<'chat_ia_mensagens'>;

// Espelha supabase/functions/_shared/regrasEstudo.ts — duplicado de
// propósito: o lado Deno fica fora do tsconfig do app (ver
// tsconfig.json), então não dá pra importar direto dali.
export type ModoChatEstudo = 'explicar' | 'duvida' | 'resumo' | 'plano' | 'prova';

export const ROTULO_MODO: Record<ModoChatEstudo, string> = {
  explicar: 'Explicar conceito',
  duvida: 'Tirar dúvida',
  resumo: 'Gerar resumo',
  plano: 'Plano de estudo',
  prova: 'Prova simulada',
};

export const ICONE_MODO: Record<ModoChatEstudo, keyof typeof Ionicons.glyphMap> = {
  explicar: 'bulb-outline',
  duvida: 'help-circle-outline',
  resumo: 'document-text-outline',
  plano: 'calendar-outline',
  prova: 'timer-outline',
};

/** Marcador que separa as perguntas do gabarito na resposta da IA (modo
 * `prova`) — a Edge Function é instruída a sempre usar esse texto exato
 * (ver `montarPromptSistema` em `supabase/functions/_shared/regrasEstudo.ts`),
 * então `separarGabarito` (em `regras.ts`) confia nele pra esconder o
 * gabarito até o aluno pedir. */
export const MARCADOR_GABARITO = '===GABARITO===';
