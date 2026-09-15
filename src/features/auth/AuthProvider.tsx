import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

import { fetchOrCreateProfile } from './api';
import type { MetadadosCadastro, Profile } from './types';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** Ainda verificando se existe uma sessão salva no device. */
  isLoadingSession: boolean;
  /** Tem sessão, mas o perfil ainda não voltou (ou está sendo criado). */
  isLoadingProfile: boolean;
  /** Sessão veio de um link de "esqueci minha senha" (evento
   * `PASSWORD_RECOVERY` do Supabase) — o RootNavigator usa isto pra
   * levar direto pra `/redefinir-senha` em vez de deixar a pessoa cair
   * solta dentro do app com essa sessão temporária (ver comentário em
   * `solicitarRedefinicaoSenha`, `features/auth/api.ts`). Só quem
   * termina a troca de senha (`limparRecuperacaoSenha`) sai desse modo. */
  isPasswordRecovery: boolean;
  limparRecuperacaoSenha: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Fonte única de verdade pra sessão + perfil do usuário logado. O
 * RootLayout usa `session`/`profile` daqui pra decidir entre as rotas de
 * login, onboarding e app autenticado (ver app/_layout.tsx).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, novaSessao) => {
      setSession(novaSessao);
      // Disparado quando `detectSessionInUrl` autentica sozinho a
      // sessão que vem do link de "esqueci minha senha" — ver
      // `solicitarRedefinicaoSenha`.
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const email = session?.user.email;
  // Login social (Google/Apple) não usa `MetadadosCadastro` nenhum — o
  // Supabase preenche `user_metadata` sozinho com os campos padrão do
  // provedor (`full_name`/`name`, não o nosso `nome` de cadastro normal).
  // `nomeUsuario`/`idade`/os consentimentos ficam mesmo undefined nesse
  // caso — só o formulário de `(completar-cadastro)` preenche depois.
  const metadata = session?.user.user_metadata as
    (MetadadosCadastro & { full_name?: string; name?: string }) | undefined;
  const nomeSocial = metadata?.full_name ?? metadata?.name;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () =>
      fetchOrCreateProfile(userId as string, {
        email: email ?? '',
        nome: metadata?.nome ?? nomeSocial,
        nomeUsuario: metadata?.nomeUsuario,
        idade: metadata?.idade,
        aceitouTermos: metadata?.aceitouTermos,
        consentimentoResponsavel: metadata?.consentimentoResponsavel,
      }),
    enabled: !!userId,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: profileQuery.data ?? null,
      isLoadingSession,
      isLoadingProfile: !!userId && profileQuery.isPending,
      isPasswordRecovery,
      limparRecuperacaoSenha: () => setIsPasswordRecovery(false),
    }),
    [session, profileQuery.data, profileQuery.isPending, isLoadingSession, userId, isPasswordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  return ctx;
}
