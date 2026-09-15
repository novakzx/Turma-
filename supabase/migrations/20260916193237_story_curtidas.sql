-- Curtidas em stories (pedido do usuário — página de notificações
-- precisa mostrar "curtiram sua story", mas stories nunca tiveram
-- curtida nenhuma até agora). Mesmo padrão de `post_curtidas`.
create table public.story_curtidas (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (story_id, autor_id)
);

create index story_curtidas_story_id_idx on public.story_curtidas (story_id);

alter table public.story_curtidas enable row level security;

-- Mesmo truque de `post_curtidas_select`: filtra só pelo id existir em
-- `stories`, deixando a RLS da própria tabela `stories` (autor, quem
-- segue, ou mesma turma — e não expirada) decidir o que aparece.
create policy story_curtidas_select on public.story_curtidas
  for select to authenticated
  using (story_id in (select id from public.stories));

create policy story_curtidas_insert on public.story_curtidas
  for insert to authenticated
  with check (autor_id = auth.uid() and story_id in (select id from public.stories));

create policy story_curtidas_delete on public.story_curtidas
  for delete to authenticated
  using (autor_id = auth.uid());

grant select, insert, delete on public.story_curtidas to authenticated;
