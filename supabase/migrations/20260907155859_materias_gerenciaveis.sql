-- Fase 8: matérias deixam de ser só gerenciáveis pelo Supabase Studio —
-- staff (professor/coordenacao) da escola da turma pode criar/editar/
-- apagar. Continua restrito a staff (não é o aluno que gerencia) — o
-- "quem cria/gerencia a turma" do pedido do usuário, na estrutura atual
-- (turma institucional, ainda não a versão "criada por usuário" da
-- Fase 9), é a própria coordenação/professor da escola.
--
-- Apagar materia é destrutivo: avaliacoes, mensagens de chat_ia e a
-- sala de chat da matéria são ON DELETE CASCADE (ver schema inicial) —
-- o app pede confirmação explícita antes (não é responsabilidade do
-- banco impedir, já que é um cascade intencional desde a Fase 0).
create policy materias_insert on public.materias
  for insert to authenticated
  with check (
    private.is_staff()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.escola_id = private.current_escola_id()
    )
  );

create policy materias_update on public.materias
  for update to authenticated
  using (
    private.is_staff()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.escola_id = private.current_escola_id()
    )
  )
  with check (
    private.is_staff()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.escola_id = private.current_escola_id()
    )
  );

create policy materias_delete on public.materias
  for delete to authenticated
  using (
    private.is_staff()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.escola_id = private.current_escola_id()
    )
  );

-- professor_id é livre pra staff atribuir (nao restringimos GRANT
-- coluna-a-coluna aqui: só staff chega nessas policies de qualquer jeito).
