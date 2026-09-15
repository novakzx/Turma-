-- Pedido do usuário: "como posso adicionar pra ia ver fotos das
-- anotacoes do alunos ou outras coisas assim?" — o aluno tira/escolhe
-- uma foto da anotação/exercício e a IA (agora com um modelo de visão,
-- ver Edge Function chat-estudo) responde sobre ela.
--
-- `midia_url` guarda só o CAMINHO no bucket (mesmo padrão de
-- `posts.midia_url`/`profiles.foto_url`) — a URL assinada é gerada na
-- hora de exibir, nunca gravada pronta (expira).
alter table public.chat_ia_mensagens
  add column midia_url text null;

-- Bucket privado — mesmo racional de posts-midia/perfil-fotos (dado de
-- menor de idade, nada de link público adivinhável), mas MAIS restrito
-- que os dois: isto é a anotação/caderno do aluno, não algo social —
-- só o próprio aluno (nunca colega de turma, nunca staff) pode ver a
-- própria foto. Path sempre "{aluno_id}/arquivo.ext".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estudo-fotos', 'estudo-fotos', false,
  10 * 1024 * 1024, -- 10 MB, mesmo teto de posts-midia
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
);

create policy estudo_fotos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'estudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy estudo_fotos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'estudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy estudo_fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'estudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
