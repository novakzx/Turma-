-- Advisor de segurança acusou `entrar_turma_por_ano` chamável por `anon`
-- (Postgres concede EXECUTE a PUBLIC por padrão em toda função nova, a
-- não ser que seja revogado explicitamente -- mesmo gap que já existe
-- nas outras RPCs security definer deste projeto, mas fechado aqui
-- porque essa mexe em profiles.turma_id/numero_cartao_estudante).
revoke execute on function public.entrar_turma_por_ano(uuid, text, text) from public;
