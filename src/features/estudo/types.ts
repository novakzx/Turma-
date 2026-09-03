import type { Tables } from '@/types/database';

export type MensagemChatIA = Tables<'chat_ia_mensagens'>;

// Espelha supabase/functions/_shared/regrasEstudo.ts — duplicado de
// propósito: o lado Deno fica fora do tsconfig do app (ver
// tsconfig.json), então não dá pra importar direto dali.
export type ModoChatEstudo = 'explicar' | 'duvida' | 'resumo' | 'plano';

export const ROTULO_MODO: Record<ModoChatEstudo, string> = {
  explicar: 'Explicar conceito',
  duvida: 'Tirar dúvida',
  resumo: 'Gerar resumo',
  plano: 'Plano de estudo',
};
