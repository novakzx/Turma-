-- Apresentações geradas por IA (pedido do usuário — "IA que faz
-- apresentações... que nem no powerpoint canva"). Versão simples
-- (escolhida pelo usuário entre duas opções): texto + imagem gerados
-- por IA, vistos como carrossel dentro do app — não gera arquivo
-- .pptx baixável (isso seria a "versão de verdade", mais trabalho,
-- fica pra depois se pedirem).
create table public.apresentacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  materia_id uuid not null references public.materias (id) on delete cascade,
  topico text not null check (char_length(btrim(topico)) > 0 and char_length(topico) <= 200),
  criado_em timestamptz not null default now()
);

create table public.apresentacao_slides (
  id uuid primary key default gen_random_uuid(),
  apresentacao_id uuid not null references public.apresentacoes (id) on delete cascade,
  ordem int not null,
  titulo text not null,
  topicos text[] not null default '{}',
  midia_url text,
  unique (apresentacao_id, ordem)
);

create index apresentacoes_aluno_id_idx on public.apresentacoes (aluno_id);
create index apresentacao_slides_apresentacao_id_idx on public.apresentacao_slides (apresentacao_id);

alter table public.apresentacoes enable row level security;
alter table public.apresentacao_slides enable row level security;

-- Igual `chat_ia_mensagens`: sem policy de INSERT pra `authenticated`
-- de propósito — só a Edge Function (service role) grava, depois de
-- chamar a IA de texto e a de imagem. O app nunca chama IA direto.
create policy apresentacoes_select on public.apresentacoes
  for select to authenticated
  using (aluno_id = auth.uid());

create policy apresentacoes_delete on public.apresentacoes
  for delete to authenticated
  using (aluno_id = auth.uid());

create policy apresentacao_slides_select on public.apresentacao_slides
  for select to authenticated
  using (apresentacao_id in (select id from public.apresentacoes));

grant select, delete on public.apresentacoes to authenticated;
grant select on public.apresentacao_slides to authenticated;

-- Bucket privado pra imagem de cada slide — path
-- "{aluno_id}/{apresentacao_id}/{ordem}.jpg", mesmo racional dos
-- outros buckets privados do projeto (posts-midia, estudo-fotos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apresentacoes-midia', 'apresentacoes-midia', false, 5*1024*1024, array['image/jpeg','image/jpg','image/png']);

create policy apresentacoes_midia_select on storage.objects for select to authenticated
  using (bucket_id = 'apresentacoes-midia' and (storage.foldername(name))[1] = auth.uid()::text);
-- Insert só pela service role (upload acontece dentro da Edge
-- Function, nunca do app) — sem policy de insert pra `authenticated`
-- de propósito, mesmo racional das tabelas acima.
