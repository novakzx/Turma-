-- Pedido do usuário: aluno também pode adicionar matéria da própria
-- turma (antes só staff, Fase 8). Fica só o "adicionar" — renomear e
-- apagar continuam staff-only (`materias_update`/`materias_delete`,
-- migration `materias_gerenciaveis`), porque apagar é destrutivo
-- (cascade em avaliações, chat com IA e a sala de chat da matéria: se
-- qualquer aluno pudesse apagar, um aluno derrubaria os dados de todo
-- mundo na turma por engano). Policy nova, permissiva, some com a
-- `materias_insert` de staff (RLS junta com OR): aqui não tem checagem
-- de papel nenhuma, só que a matéria seja da própria turma do usuário —
-- staff continua coberto pela policy antiga (que alcança qualquer turma
-- da mesma escola, não só a própria).
create policy materias_insert_aluno on public.materias
  for insert to authenticated
  with check (turma_id = private.current_turma_id());
