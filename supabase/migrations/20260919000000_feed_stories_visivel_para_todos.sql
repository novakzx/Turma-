-- Feed e stories abertos pra qualquer conta do app (pedido do usuário) —
-- antes só via mesma turma (posts) ou mesma turma/quem segue (stories).
-- Trade-off de privacidade explícito, reverte parte de uma decisão
-- anterior (ver comentário em
-- `20260908000000_seguidores_stories_perfil_publico.sql`: "o feed da
-- turma continua turma-a-turma, sem mistura"): post/story de aluno
-- menor de idade passa a ser visível pra qualquer usuário autenticado
-- do app, não só colega de turma/escola. Curtidas/comentários
-- (`post_curtidas_select`/`post_comentarios_select`) já seguem a
-- visibilidade de `posts` via `post_id in (select id from public.posts)`
-- — não precisam de policy própria pra acompanhar essa mudança.
alter policy posts_select on public.posts
  using (true);

alter policy stories_select on public.stories
  using (expira_em > now());

-- Bucket de mídia de story espelhava a mesma régua (autor/segue/turma) —
-- abre igual: qualquer autenticado pode ler, expiração continua sendo
-- responsabilidade só da consulta à tabela (não do Storage).
alter policy stories_midia_select on storage.objects
  using (bucket_id = 'stories-midia');
