-- Corrige regressão: `posts_select` virou visível pra qualquer autenticado
-- (migration `feed_stories_visivel_para_todos`, mesmo commit que corrigiu
-- `stories_midia_select`), mas a policy de leitura do Storage de
-- `posts-midia` ficou pra trás, ainda escopada por turma/escola (herdada
-- da versão antiga do feed, turma-a-turma). Resultado ao vivo (achado
-- testando de verdade com duas contas de escolas diferentes): post de
-- gente fora da própria turma aparece certinho no feed (legenda, curtidas,
-- comentários), mas a FOTO nunca carrega pra quem não é da mesma turma —
-- RLS nega o `createSignedUrl` (a chamada volta 400, sem pista nenhuma pro
-- usuário; no app fica um spinner girando pra sempre). Mesmo racional já
-- usado pra `stories_midia_select`: se o post é público pra qualquer
-- autenticado, a mídia dele também precisa ser.
alter policy posts_midia_select on storage.objects
  using (bucket_id = 'posts-midia');
