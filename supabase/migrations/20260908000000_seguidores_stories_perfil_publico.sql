-- Fase 10: perfil estilo Instagram — seguidores/seguindo, stories, e
-- perfil público de verdade (até aqui `profiles.publico` só gravava a
-- preferência, ver comentário em `atualizarPrivacidade`).
--
-- Decisão já tomada com o usuário (pedido de Fase 7-9): perfil aberto
-- pra qualquer usuário do app, de qualquer escola. Isso muda a regra
-- de quem pode ler `profiles` (antes só mesma turma/escola/staff) — a
-- partir daqui, `publico = true` libera leitura geral.
alter policy profiles_select on public.profiles
  using (
    id = auth.uid()
    or turma_id = private.current_turma_id()
    or (private.is_staff() and escola_id = private.current_escola_id())
    or publico = true
  );

-- Grid de posts no perfil público segue a mesma régua: só aparece post
-- de autor com `publico = true` pra quem é de fora da turma dele. O
-- feed da turma (consulta sempre filtra por `turma_id` no app, nunca
-- só confia na RLS) continua turma-a-turma, sem mistura — isso só
-- afasta o "post não aparece nem no MEU perfil público" pra quem
-- decidiu abrir o perfil.
alter policy posts_select on public.posts
  using (
    turma_id = private.current_turma_id()
    or (
      private.current_papel() = 'coordenacao'
      and turma_id in (select id from public.turmas where escola_id = private.current_escola_id())
    )
    or exists (
      select 1 from public.profiles autor
      where autor.id = posts.autor_id and autor.publico = true
    )
  );

create table public.seguidores (
  id uuid primary key default gen_random_uuid(),
  seguidor_id uuid not null references public.profiles (id) on delete cascade,
  seguido_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint seguidores_nao_a_si_mesmo check (seguidor_id <> seguido_id),
  constraint seguidores_par_unico unique (seguidor_id, seguido_id)
);

create index seguidores_seguido_id_idx on public.seguidores (seguido_id);
create index seguidores_seguidor_id_idx on public.seguidores (seguidor_id);

alter table public.seguidores enable row level security;

-- Contagem/lista de seguidores é pública (mesma régua do perfil aberto
-- — ver acima). Só o próprio usuário segue/deixa de seguir por si.
create policy seguidores_select on public.seguidores
  for select to authenticated
  using (true);

create policy seguidores_insert on public.seguidores
  for insert to authenticated
  with check (seguidor_id = auth.uid());

create policy seguidores_delete on public.seguidores
  for delete to authenticated
  using (seguidor_id = auth.uid());

grant select, insert, delete on public.seguidores to authenticated;

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.profiles (id) on delete cascade,
  midia_url text not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '24 hours')
);

create index stories_autor_id_idx on public.stories (autor_id);
create index stories_expira_em_idx on public.stories (expira_em);

alter table public.stories enable row level security;

-- Visível pra: o próprio autor, quem segue o autor, e gente da mesma
-- turma (turma já é visível hoje, sem precisar seguir — story de
-- colega de turma aparece igual a post de colega de turma). Expirada
-- (>24h) não aparece pra ninguém, mesmo o autor — o arquivo em si fica
-- no Storage (não apaga sozinho), só a consulta some; documentado
-- como limitação conhecida.
create policy stories_select on public.stories
  for select to authenticated
  using (
    expira_em > now()
    and (
      autor_id = auth.uid()
      or exists (
        select 1 from public.seguidores s
        where s.seguidor_id = auth.uid() and s.seguido_id = stories.autor_id
      )
      or exists (
        select 1 from public.profiles autor
        where autor.id = stories.autor_id and autor.turma_id = private.current_turma_id()
      )
    )
  );

create policy stories_insert on public.stories
  for insert to authenticated
  with check (autor_id = auth.uid());

create policy stories_delete on public.stories
  for delete to authenticated
  using (autor_id = auth.uid());

grant select, insert, delete on public.stories to authenticated;

-- Bucket privado pra mídia de story (mesmo racional do posts-midia e
-- perfil-fotos: sem link público adivinhável, público é menor de
-- idade). Path começa com o autor_id (não com turma_id, já que story é
-- visível também pra quem segue de fora da turma) — a policy de select
-- do bucket espelha a da tabela `stories` (sem checar expiração aqui,
-- é só sobre "quem pode ver o autor", não "há quanto tempo").
insert into storage.buckets (id, name, public)
values ('stories-midia', 'stories-midia', false);

create policy stories_midia_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'stories-midia'
    and exists (
      select 1 from public.profiles autor
      where autor.id::text = (storage.foldername(name))[1]
        and (
          autor.id = auth.uid()
          or exists (
            select 1 from public.seguidores s
            where s.seguidor_id = auth.uid() and s.seguido_id = autor.id
          )
          or autor.turma_id = private.current_turma_id()
        )
    )
  );

create policy stories_midia_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'stories-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
