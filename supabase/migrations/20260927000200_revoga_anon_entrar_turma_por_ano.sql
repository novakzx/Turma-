-- `revoke ... from public` (migration anterior) sozinho não bastou --
-- o projeto Supabase concede EXECUTE em função nova do schema public
-- pra `anon`/`authenticated` via default privileges, independente de
-- PUBLIC. Revoga de `anon` explicitamente também (fica só pra
-- `authenticated`, que já tem grant próprio, ver migration
-- `turma_por_ano_escolar`).
revoke execute on function public.entrar_turma_por_ano(uuid, text, text) from anon;
