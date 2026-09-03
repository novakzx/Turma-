import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

/** Dado salvo em `user_metadata` no cadastro (ver `signUp`) — só existe
 * pra `fetchOrCreateProfile` usar como valor inicial no primeiro login,
 * já que o `profiles` só pode ser criado depois de existir sessão
 * autenticada (policy de insert exige `auth.uid() = id`). */
export type MetadadosCadastro = {
  nome?: string;
  nomeUsuario?: string;
  idade?: number;
  aceitouTermos?: boolean;
  consentimentoResponsavel?: boolean;
};
