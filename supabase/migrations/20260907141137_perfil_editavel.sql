-- Perfil editável (nome, foto, bio, nome de usuário) e "ver minhas
-- publicações" — nome/foto_url já eram grantáveis desde o schema
-- inicial; aqui só entram as duas colunas novas.
alter table public.profiles
  add column nome_usuario text,
  add column bio text;

alter table public.profiles
  add constraint profiles_nome_usuario_formato check (
    nome_usuario is null or nome_usuario ~ '^[a-z0-9_]{3,20}$'
  );

-- Nome único constraint (índice único padrão do Postgres trata NULL como
-- distinto entre si, então quem ainda não escolheu nome de usuário não
-- colide com ninguém).
alter table public.profiles
  add constraint profiles_nome_usuario_key unique (nome_usuario);

alter table public.profiles
  add constraint profiles_bio_tamanho check (bio is null or char_length(bio) <= 280);

grant update (nome_usuario, bio) on public.profiles to authenticated;

-- Bucket privado pra foto de perfil (mesmo racional de posts-midia:
-- retrato de menor de idade não pode ter link público adivinhável).
-- Path sempre "{user_id}/arquivo.ext" — escopa select/insert por dono
-- sem precisar de tabela extra. Leitura liberada pra quem já enxergaria
-- o perfil da pessoa via profiles_select (própria escola).
insert into storage.buckets (id, name, public)
values ('perfil-fotos', 'perfil-fotos', false);

create policy perfil_fotos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'perfil-fotos'
    and exists (
      select 1 from public.profiles p
      where p.id = ((storage.foldername(name))[1])::uuid
        and (p.id = auth.uid() or p.escola_id = private.current_escola_id())
    )
  );

create policy perfil_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy perfil_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy perfil_fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
