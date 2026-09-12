-- Performance (advisor `unindexed_foreign_keys`, 22 achados): toda FK
-- abaixo não tinha índice cobrindo a coluna, o que deixa lento qualquer
-- JOIN/lookup por ela e qualquer `ON DELETE`/`ON UPDATE` que precise achar
-- as linhas filhas (ex.: apagar um perfil e o banco ter que varrer
-- `posts` inteira procurando `autor_id` sem índice). Dataset ainda é
-- pequeno (não muda comportamento agora), mas cresce com o uso — melhor
-- já nascer com índice do que descobrir isso como incidente de produção
-- depois. `IF NOT EXISTS` pra migration ser reaplicável sem erro.
create index if not exists avaliacoes_materia_id_idx on public.avaliacoes (materia_id);
create index if not exists avisos_autor_id_idx on public.avisos (autor_id);
create index if not exists bloqueios_bloqueado_id_idx on public.bloqueios (bloqueado_id);
create index if not exists chat_ia_mensagens_materia_id_idx on public.chat_ia_mensagens (materia_id);
create index if not exists conversas_criado_por_idx on public.conversas (criado_por);
create index if not exists conversas_participantes_profile_id_idx on public.conversas_participantes (profile_id);
create index if not exists denuncias_denunciante_id_idx on public.denuncias (denunciante_id);
create index if not exists materias_professor_id_idx on public.materias (professor_id);
create index if not exists materias_turma_id_idx on public.materias (turma_id);
create index if not exists mensagens_chat_autor_id_idx on public.mensagens_chat (autor_id);
create index if not exists mensagens_diretas_autor_id_idx on public.mensagens_diretas (autor_id);
create index if not exists post_comentarios_autor_id_idx on public.post_comentarios (autor_id);
create index if not exists post_curtidas_autor_id_idx on public.post_curtidas (autor_id);
create index if not exists post_enquete_votos_opcao_id_idx on public.post_enquete_votos (opcao_id);
create index if not exists post_enquete_votos_votante_id_idx on public.post_enquete_votos (votante_id);
create index if not exists posts_autor_id_idx on public.posts (autor_id);
create index if not exists salas_chat_criado_por_idx on public.salas_chat (criado_por);
create index if not exists salas_chat_materia_id_idx on public.salas_chat (materia_id);
create index if not exists salas_chat_turma_id_idx on public.salas_chat (turma_id);
create index if not exists turma_pedidos_entrada_profile_id_idx on public.turma_pedidos_entrada (profile_id);
create index if not exists turmas_criado_por_idx on public.turmas (criado_por);
create index if not exists turmas_escola_id_idx on public.turmas (escola_id);
