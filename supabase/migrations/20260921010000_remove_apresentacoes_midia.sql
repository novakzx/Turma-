-- Reverte a apresentação com imagem gerada por IA (migration
-- `apresentacoes_midia`) — usuário testou ao vivo e pediu pra tirar a
-- função inteira ("tira essa função de apresentação não gostei").
--
-- `set local storage.allow_delete_query` libera, só pra esta transação,
-- o bypass do guard que o próprio Supabase põe em `storage.objects`
-- (gatilho `protect_delete`, pensado pra evitar DELETE acidental direto
-- via SQL) — é o mecanismo documentado pra limpeza administrativa de
-- verdade, não um jeito de burlar segurança nenhuma.
set local storage.allow_delete_query = 'true';

delete from storage.objects where bucket_id = 'apresentacoes-midia';
drop policy if exists apresentacoes_midia_select on storage.objects;
delete from storage.buckets where id = 'apresentacoes-midia';
