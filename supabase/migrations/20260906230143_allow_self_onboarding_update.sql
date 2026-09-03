-- A Fase 0 travou UPDATE em profiles pra evitar autopromoção de papel, mas
-- travou junto escola_id/turma_id — que são exatamente as colunas que o
-- onboarding da Fase 1 precisa escrever (aluno escolhendo escola/turma).
--
-- papel continua de fora da lista (só Studio/SQL promove alguém a
-- professor/coordenacao); escola_id/turma_id entram porque são dados que
-- o próprio usuário deve poder definir (e redefinir, se trocar de turma).
grant update (nome, foto_url, push_token, silenciado_ate, escola_id, turma_id)
  on public.profiles to authenticated;
