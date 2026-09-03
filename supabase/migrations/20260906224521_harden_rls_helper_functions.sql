-- O advisor de segurança apontou que current_papel(), current_escola_id(),
-- current_turma_id(), is_staff() e as três funções de trigger ficaram
-- expostas como endpoints públicos (/rest/v1/rpc/...) só por estarem no
-- schema `public`, que o PostgREST expõe automaticamente. Nenhuma delas
-- deveria ser chamada direto pela API — são helpers internos de RLS/trigger.
--
-- Mover pra um schema `private` (fora da lista de schemas exposta pelo
-- PostgREST) resolve isso sem tocar em nenhuma policy: policy e trigger
-- referenciam a função pelo OID internamente, então ALTER FUNCTION ...
-- SET SCHEMA continua funcionando pra quem já usa a função, só tira a
-- rota pública de API.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.current_papel() set schema private;
alter function public.current_escola_id() set schema private;
alter function public.current_turma_id() set schema private;
alter function public.is_staff() set schema private;
alter function public.profiles_guard_moderacao() set schema private;
alter function public.criar_sala_turma() set schema private;
alter function public.criar_sala_materia() set schema private;

-- current_papel/current_escola_id/current_turma_id/is_staff são chamadas
-- de dentro das policies (papel do `authenticated`), então esse grant
-- continua necessário — só tiram do PUBLIC (que inclui `anon`).
revoke execute on function private.current_papel() from public;
revoke execute on function private.current_escola_id() from public;
revoke execute on function private.current_turma_id() from public;
revoke execute on function private.is_staff() from public;
grant execute on function private.current_papel() to authenticated;
grant execute on function private.current_escola_id() to authenticated;
grant execute on function private.current_turma_id() to authenticated;
grant execute on function private.is_staff() to authenticated;

-- As três de trigger nunca precisam ser chamadas diretamente por ninguém
-- — o mecanismo de trigger do Postgres não passa pelo GRANT/REVOKE de
-- EXECUTE do papel que disparou o INSERT/UPDATE, então zerar isso pra
-- todo mundo (incluindo authenticated) é seguro e não quebra nada.
revoke execute on function private.profiles_guard_moderacao() from public, authenticated;
revoke execute on function private.criar_sala_turma() from public, authenticated;
revoke execute on function private.criar_sala_materia() from public, authenticated;
