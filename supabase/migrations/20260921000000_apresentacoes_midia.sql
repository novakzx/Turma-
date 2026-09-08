-- Imagem gerada por IA pra cada slide da apresentação (pedido do
-- usuário: "não tem como ele fazer as fotos da apresentação e não só o
-- texto?"). Bucket privado, path começa com o id do aluno (conteúdo
-- gerado só pra ele, nunca compartilhado com outra turma/aluno — ao
-- contrário de posts/stories, que são visibilidade ampla de propósito).
-- Só a Edge Function `chat-estudo` grava aqui (com a service role, que
-- ignora RLS) — por isso só existe policy de SELECT, nenhuma de INSERT
-- pra `authenticated`: o cliente nunca sobe imagem direto nesse bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apresentacoes-midia', 'apresentacoes-midia', false, 5242880, array['image/png', 'image/jpeg']);

create policy apresentacoes_midia_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'apresentacoes-midia'
    and ((storage.foldername(name))[1])::uuid = auth.uid()
  );
