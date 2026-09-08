-- Enquete rápida no feed (pedido explícito do usuário) — um post tipo
-- "enquete" tem 2-4 opções fixas (criadas junto com o post, imutáveis
-- depois — "comece simples", igual o resto do filtro/moderação deste
-- projeto) e cada aluno vota uma vez por enquete, podendo trocar de
-- voto (unique em post_id+votante_id, upsert no lugar de update
-- separado).
alter type tipo_post add value if not exists 'enquete';

create table public.post_enquete_opcoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  texto text not null,
  ordem smallint not null default 0
);

create table public.post_enquete_votos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  opcao_id uuid not null references public.post_enquete_opcoes (id) on delete cascade,
  votante_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (post_id, votante_id)
);

create index post_enquete_opcoes_post_id_idx on public.post_enquete_opcoes (post_id);
create index post_enquete_votos_post_id_idx on public.post_enquete_votos (post_id);

alter table public.post_enquete_opcoes enable row level security;
alter table public.post_enquete_votos enable row level security;

-- Mesmo padrão de `post_curtidas`: quem pode ver o post (RLS de
-- `posts`, já cuida de turma/escola/perfil público) pode ver as opções
-- e os votos dela.
create policy post_enquete_opcoes_select on public.post_enquete_opcoes
  for select using (post_id in (select id from public.posts));

-- Só o autor do post pode criar as opções -- feito logo depois de criar
-- o post em si (ver `criarEnquete`, src/features/feed/api.ts), nunca
-- depois (sem UPDATE/DELETE de opção nesta versão: enquete imutável
-- depois de publicada).
create policy post_enquete_opcoes_insert on public.post_enquete_opcoes
  for insert with check (
    post_id in (select id from public.posts where autor_id = auth.uid())
  );

create policy post_enquete_votos_select on public.post_enquete_votos
  for select using (post_id in (select id from public.posts));

-- `opcao_id` precisa pertencer de fato ao `post_id` informado (não só
-- existir em algum outro post) -- sem isso, alguém poderia votar numa
-- opção de uma enquete diferente da que está sendo exibida.
create policy post_enquete_votos_insert on public.post_enquete_votos
  for insert with check (
    votante_id = auth.uid()
    and post_id in (select id from public.posts)
    and exists (
      select 1 from public.post_enquete_opcoes o
      where o.id = opcao_id and o.post_id = post_enquete_votos.post_id
    )
  );

-- Upsert (trocar de voto) e "desvotar" — sempre só o próprio voto.
create policy post_enquete_votos_update on public.post_enquete_votos
  for update using (votante_id = auth.uid()) with check (
    votante_id = auth.uid()
    and exists (
      select 1 from public.post_enquete_opcoes o
      where o.id = opcao_id and o.post_id = post_enquete_votos.post_id
    )
  );

create policy post_enquete_votos_delete on public.post_enquete_votos
  for delete using (votante_id = auth.uid());
