-- Foto e áudio nos chats (pedido do usuário) — vale tanto pra DM
-- (`mensagens_diretas`) quanto pra sala (`mensagens_chat`). `conteudo`
-- vira opcional (mensagem só de mídia não tem texto), com um CHECK
-- garantindo que pelo menos um dos dois exista — nunca uma linha
-- totalmente vazia.
alter table public.mensagens_diretas
  alter column conteudo drop not null,
  add column midia_url text,
  add column midia_tipo text check (midia_tipo in ('imagem', 'audio'));

alter table public.mensagens_diretas
  add constraint mensagens_diretas_conteudo_ou_midia
  check (conteudo is not null or midia_url is not null);

alter table public.mensagens_chat
  alter column conteudo drop not null,
  add column midia_url text,
  add column midia_tipo text check (midia_tipo in ('imagem', 'audio'));

alter table public.mensagens_chat
  add constraint mensagens_chat_conteudo_ou_midia
  check (conteudo is not null or midia_url is not null);

-- Buckets privados (mesmo racional de posts-midia/stories-midia: público
-- é majoritariamente menor de idade, sem link adivinhável). Path começa
-- com o id da conversa/sala — a policy do bucket espelha a policy da
-- tabela (se não pode ver as mensagens, não pode ver a mídia).
insert into storage.buckets (id, name, public)
values ('conversas-midia', 'conversas-midia', false);

create policy conversas_midia_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'conversas-midia'
    and private.sou_participante(((storage.foldername(name))[1])::uuid)
  );

create policy conversas_midia_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'conversas-midia'
    and private.sou_participante(((storage.foldername(name))[1])::uuid)
  );

insert into storage.buckets (id, name, public)
values ('salas-midia', 'salas-midia', false);

create policy salas_midia_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'salas-midia'
    and ((storage.foldername(name))[1])::uuid in (select id from public.salas_chat)
  );

create policy salas_midia_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'salas-midia'
    and ((storage.foldername(name))[1])::uuid in (
      select id from public.salas_chat where not trancada
    )
    and not exists (
      select 1 from public.profiles
      where id = auth.uid() and silenciado_ate is not null and silenciado_ate > now()
    )
  );
