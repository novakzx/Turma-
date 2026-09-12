-- Performance (advisor `auth_rls_initplan`, 47 achados): toda policy
-- abaixo chamava `auth.uid()`/`private.*()` direto na condição, o que o
-- Postgres reavalia POR LINHA em vez de uma vez só por query (o 
-- resultado não muda -- são funções STABLE dentro da mesma transação --
-- só o plano de execução fica mais lento à toa em tabela grande).
-- Envolver em `(select ...)` deixa o otimizador tratar como um valor
-- constante calculado uma vez (InitPlan), padrão documentado pelo
-- próprio Supabase pra esse advisor. Mesma lógica de cada policy,
-- só a forma de chamar a função muda -- conferido comparando com
-- `pg_policies` antes de escrever esta migration.

alter policy avaliacoes_all on public.avaliacoes
  using (aluno_id = (select auth.uid()))
  with check (aluno_id = (select auth.uid()));

alter policy avisos_delete on public.avisos
  using ((autor_id = (select auth.uid())) OR ((select private.is_staff()) AND (escola_id = (select private.current_escola_id()))));

alter policy avisos_insert on public.avisos
  with check ((select private.is_staff()) AND (autor_id = (select auth.uid())) AND (escola_id = (select private.current_escola_id())) AND (tipo <> 'trajeto'::tipo_aviso));

alter policy avisos_select on public.avisos
  using ((escola_id = (select private.current_escola_id())) AND ((turma_id IS NULL) OR (turma_id = (select private.current_turma_id()))));

alter policy avisos_update on public.avisos
  using (autor_id = (select auth.uid()))
  with check ((autor_id = (select auth.uid())) AND (tipo <> 'trajeto'::tipo_aviso));

alter policy bloqueios_delete on public.bloqueios
  using (bloqueador_id = (select auth.uid()));

alter policy bloqueios_insert on public.bloqueios
  with check (bloqueador_id = (select auth.uid()));

alter policy bloqueios_select on public.bloqueios
  using (bloqueador_id = (select auth.uid()));

alter policy chat_ia_mensagens_select on public.chat_ia_mensagens
  using (aluno_id = (select auth.uid()));

alter policy conversas_select on public.conversas
  using (EXISTS (SELECT 1 FROM conversas_participantes cp WHERE (cp.conversa_id = conversas.id) AND (cp.profile_id = (select auth.uid()))));

alter policy conversas_participantes_delete on public.conversas_participantes
  using (profile_id = (select auth.uid()));

alter policy conversas_participantes_select on public.conversas_participantes
  using ((profile_id = (select auth.uid())) OR (select private.sou_participante(conversa_id)));

alter policy conversas_participantes_update on public.conversas_participantes
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

alter policy denuncias_insert on public.denuncias
  with check ((denunciante_id = (select auth.uid())) AND (escola_id = (select private.current_escola_id())));

alter policy denuncias_select on public.denuncias
  using ((denunciante_id = (select auth.uid())) OR ((select private.is_staff()) AND (escola_id = (select private.current_escola_id()))));

alter policy denuncias_update on public.denuncias
  using ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())))
  with check ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())));

alter policy flashcards_delete on public.flashcards
  using (aluno_id = (select auth.uid()));

alter policy flashcards_insert on public.flashcards
  with check (aluno_id = (select auth.uid()));

alter policy flashcards_select on public.flashcards
  using (aluno_id = (select auth.uid()));

alter policy flashcards_update on public.flashcards
  using (aluno_id = (select auth.uid()));

alter policy mensagens_chat_insert on public.mensagens_chat
  with check ((autor_id = (select auth.uid())) AND (sala_id IN (SELECT id FROM salas_chat WHERE NOT trancada)) AND NOT (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = (select auth.uid())) AND (profiles.silenciado_ate IS NOT NULL) AND (profiles.silenciado_ate > now()))));

alter policy mensagens_chat_moderacao on public.mensagens_chat
  using ((select private.is_staff()) AND (sala_id IN (SELECT id FROM salas_chat WHERE (escola_id = (select private.current_escola_id())))))
  with check ((select private.is_staff()));

alter policy mensagens_chat_select on public.mensagens_chat
  using ((sala_id IN (SELECT id FROM salas_chat)) AND ((NOT apagada) OR (select private.is_staff())));

alter policy mensagens_diretas_insert on public.mensagens_diretas
  with check ((autor_id = (select auth.uid())) AND (EXISTS (SELECT 1 FROM conversas_participantes cp WHERE (cp.conversa_id = mensagens_diretas.conversa_id) AND (cp.profile_id = (select auth.uid())))) AND NOT (EXISTS (SELECT 1 FROM conversas_participantes outro WHERE (outro.conversa_id = mensagens_diretas.conversa_id) AND (outro.profile_id <> (select auth.uid())) AND (select private.existe_bloqueio_entre(outro.profile_id, (select auth.uid()))))));

alter policy mensagens_diretas_select on public.mensagens_diretas
  using ((EXISTS (SELECT 1 FROM conversas_participantes cp WHERE (cp.conversa_id = mensagens_diretas.conversa_id) AND (cp.profile_id = (select auth.uid())))) OR ((select private.is_staff()) AND (EXISTS (SELECT 1 FROM denuncias d WHERE (d.tipo_conteudo = 'mensagem_direta'::tipo_conteudo_denuncia) AND (d.conteudo_id = mensagens_diretas.id) AND (d.escola_id = (select private.current_escola_id()))))));

alter policy mensagens_diretas_update on public.mensagens_diretas
  using (autor_id = (select auth.uid()))
  with check (autor_id = (select auth.uid()));

alter policy post_comentarios_delete on public.post_comentarios
  using ((autor_id = (select auth.uid())) OR ((select private.is_staff()) AND (post_id IN (SELECT p.id FROM posts p JOIN turmas t ON (t.id = p.turma_id) WHERE (t.escola_id = (select private.current_escola_id()))))));

alter policy post_comentarios_insert on public.post_comentarios
  with check ((autor_id = (select auth.uid())) AND (post_id IN (SELECT id FROM posts)));

alter policy post_comentarios_update on public.post_comentarios
  using (autor_id = (select auth.uid()))
  with check (autor_id = (select auth.uid()));

alter policy post_curtidas_delete on public.post_curtidas
  using (autor_id = (select auth.uid()));

alter policy post_curtidas_insert on public.post_curtidas
  with check ((autor_id = (select auth.uid())) AND (post_id IN (SELECT id FROM posts)));

alter policy post_enquete_opcoes_insert on public.post_enquete_opcoes
  with check (post_id IN (SELECT id FROM posts WHERE autor_id = (select auth.uid())));

alter policy post_enquete_votos_delete on public.post_enquete_votos
  using (votante_id = (select auth.uid()));

alter policy post_enquete_votos_insert on public.post_enquete_votos
  with check ((votante_id = (select auth.uid())) AND (post_id IN (SELECT id FROM posts)) AND (EXISTS (SELECT 1 FROM post_enquete_opcoes o WHERE (o.id = post_enquete_votos.opcao_id) AND (o.post_id = post_enquete_votos.post_id))));

alter policy post_enquete_votos_update on public.post_enquete_votos
  using (votante_id = (select auth.uid()))
  with check ((votante_id = (select auth.uid())) AND (EXISTS (SELECT 1 FROM post_enquete_opcoes o WHERE (o.id = post_enquete_votos.opcao_id) AND (o.post_id = post_enquete_votos.post_id))));

alter policy posts_delete on public.posts
  using ((autor_id = (select auth.uid())) OR ((select private.is_staff()) AND (turma_id IN (SELECT id FROM turmas WHERE (escola_id = (select private.current_escola_id()))))));

alter policy posts_insert on public.posts
  with check ((autor_id = (select auth.uid())) AND (turma_id = (select private.current_turma_id())));

alter policy posts_update on public.posts
  using (autor_id = (select auth.uid()))
  with check (autor_id = (select auth.uid()));

alter policy profiles_insert_self on public.profiles
  with check ((id = (select auth.uid())) AND (papel = 'aluno'::papel_usuario));

alter policy profiles_select on public.profiles
  using ((id = (select auth.uid())) OR (turma_id = (select private.current_turma_id())) OR ((select private.is_staff()) AND (escola_id = (select private.current_escola_id()))) OR (publico = true));

alter policy profiles_select_pedido_pendente on public.profiles
  using (EXISTS (SELECT 1 FROM turma_pedidos_entrada tp JOIN turmas t ON (t.id = tp.turma_id) WHERE (tp.profile_id = profiles.id) AND (tp.status = 'pendente'::status_pedido_turma) AND (t.criado_por = (select auth.uid()))));

alter policy profiles_update_moderacao on public.profiles
  using ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())))
  with check ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())));

alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy salas_chat_insert on public.salas_chat
  with check ((tipo = 'assunto'::tipo_sala_chat) AND (criado_por = (select auth.uid())) AND (escola_id = (select private.current_escola_id())));

alter policy salas_chat_select on public.salas_chat
  using ((escola_id = (select private.current_escola_id())) AND ((tipo = 'assunto'::tipo_sala_chat) OR ((tipo = 'turma'::tipo_sala_chat) AND (turma_id = (select private.current_turma_id()))) OR ((tipo = 'materia'::tipo_sala_chat) AND (materia_id IN (SELECT id FROM materias WHERE (turma_id = (select private.current_turma_id())))))));

alter policy salas_chat_update on public.salas_chat
  using ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())))
  with check ((select private.is_staff()) AND (escola_id = (select private.current_escola_id())));

alter policy seguidores_delete on public.seguidores
  using (seguidor_id = (select auth.uid()));

alter policy seguidores_insert on public.seguidores
  with check (seguidor_id = (select auth.uid()));

alter policy stories_delete on public.stories
  using (autor_id = (select auth.uid()));

alter policy stories_insert on public.stories
  with check (autor_id = (select auth.uid()));

alter policy traducoes_uso_select on public.traducoes_uso
  using (aluno_id = (select auth.uid()));

alter policy turma_pedidos_insert on public.turma_pedidos_entrada
  with check (profile_id = (select auth.uid()));

alter policy turma_pedidos_select on public.turma_pedidos_entrada
  using ((profile_id = (select auth.uid())) OR (EXISTS (SELECT 1 FROM turmas t WHERE (t.id = turma_pedidos_entrada.turma_id) AND (t.criado_por = (select auth.uid())))));

alter policy turmas_insert on public.turmas
  with check (criado_por = (select auth.uid()));
