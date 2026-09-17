import { useAuth } from '@/features/auth/AuthProvider';

/** Único ponto de leitura de "é assinante do Turma+ Premium?" no app --
 * centraliza o `profile?.assinatura_ativa ?? false` que hoje é repetido
 * inline em cada tela que precisa saber isso. */
export function useAssinante(): boolean {
  const { profile } = useAuth();
  return profile?.assinatura_ativa ?? false;
}
