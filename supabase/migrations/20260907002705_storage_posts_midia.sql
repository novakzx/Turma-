-- Bucket privado pra imagem de post (brief 6.4: "upload de imagem"). Path
-- sempre começa com o turma_id ("{turma_id}/arquivo.ext"), então dá pra
-- escopar select/insert por turma sem precisar de uma tabela extra —
-- mesma ideia de "post é sempre escopado à turma" que já vale pra
-- public.posts.
insert into storage.buckets (id, name, public)
values ('posts-midia', 'posts-midia', false);

create policy posts_midia_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'posts-midia'
    and (
      (storage.foldername(name))[1] = (private.current_turma_id())::text
      or (
        private.is_staff()
        and exists (
          select 1 from public.turmas t
          where t.id::text = (storage.foldername(name))[1]
            and t.escola_id = private.current_escola_id()
        )
      )
    )
  );

create policy posts_midia_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'posts-midia'
    and (storage.foldername(name))[1] = (private.current_turma_id())::text
  );
