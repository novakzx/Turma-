-- Auditoria de segurança avançada pedida pelo usuário — achado mais sério:
-- `email_por_nome_usuario` (RPC `security definer` chamável por `anon`)
-- devolve o e-mail REAL de qualquer @usuário pra quem não tem sessão
-- nenhuma. O projeto já sabia disso e mitigou com rate limit por IP
-- (20/10min, ver SECURITY.md §2/§7 antigo e migration `rate_limit_lookup_usuario`)
-- — mas "mitigado" não é "resolvido": um atacante com algumas dezenas de
-- IPs (trivial hoje em dia) ainda colhe e-mail de verdade de aluno menor
-- de idade em massa, só mais devagar. A única razão pra essa RPC existir
-- era permitir login por @usuário sem o Supabase Auth aceitar usuário (só
-- e-mail) — mas o e-mail resolvido nunca *precisava* ter chegado no
-- navegador: o cliente só precisa do resultado do login (sessão), não do
-- e-mail em si.
--
-- Fix: o login inteiro (resolver @usuário → e-mail → chamar o GoTrue)
-- passa a rodar server-side na Edge Function `login-por-usuario` (service
-- role), que devolve só os tokens de sessão pro cliente. `email_por_nome_usuario`
-- perde todo acesso público (não apagada — só revogada, zero custo em
-- manter e não some o histórico de uma função que já existiu em
-- produção). A nova `resolver_email_login` é idêntica em espírito (mesmo
-- rate limit por IP, reaproveitando `private.aplica_rate_limit` com o
-- parâmetro `p_chave_explicita` adicionado em `limita_criar_conversa_grupo`),
-- mas só o `service_role` da Edge Function consegue chamá-la — nunca um
-- navegador anônimo.
--
-- ATENÇÃO AO APLICAR: só rode isto DEPOIS de confirmar que a Edge
-- Function `login-por-usuario` já está no ar e testada — revogar
-- `email_por_nome_usuario` antes disso quebra login pra todo mundo
-- (o cliente antigo, que ainda chama essa RPC direto, para de funcionar
-- na hora; o novo, que chama a Edge Function, só funciona se ela existir).

create or replace function public.resolver_email_login(p_nome_usuario text, p_ip text)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  perform private.aplica_rate_limit('resolver_email_login', 20, interval '10 minutes', coalesce(p_ip, 'sem-ip'));
  return (select email from public.profiles where nome_usuario = lower(trim(p_nome_usuario)));
end;
$$;

revoke all on function public.resolver_email_login(text, text) from public, anon, authenticated;
grant execute on function public.resolver_email_login(text, text) to service_role;

-- `email_por_nome_usuario` só perde o acesso público depois que o
-- código do cliente (src/features/auth/api.ts) e a Edge Function
-- `login-por-usuario` já estiverem publicados e confirmados funcionando
-- de ponta a ponta — ver aviso acima. Revogado junto nesta mesma
-- migration (não em uma separada) de propósito: as duas mudanças têm que
-- ir pro ar atomicamente, senão existe uma janela em que nem o caminho
-- antigo nem o novo funcionam.
revoke all on function public.email_por_nome_usuario(text) from public, anon, authenticated;
