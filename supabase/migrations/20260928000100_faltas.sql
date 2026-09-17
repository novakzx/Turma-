-- Pedido do usuário: rastreamento de faltas, auto-declarado pelo
-- próprio aluno (mais simples que professor fazer chamada por aula —
-- decisão explícita do usuário, mesmo sabendo que o dado não é
-- garantidamente fiel). Limite configurável POR MATÉRIA (bate com como
-- reprovação por falta funciona de verdade — cada disciplina tem seu
-- próprio teto) — `null` = nenhum limite definido, nenhum aviso dispara.
alter table public.materias add column limite_faltas integer null check (limite_faltas > 0);

create table public.faltas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  materia_id uuid not null references public.materias (id) on delete cascade,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

-- Um registro por aluno+matéria+dia -- evita duplicar falta por engano
-- clicando duas vezes.
create unique index faltas_aluno_materia_dia_unico on public.faltas (aluno_id, materia_id, data);
create index faltas_aluno_materia_idx on public.faltas (aluno_id, materia_id);

alter table public.faltas enable row level security;

-- Só o próprio aluno vê/registra/apaga as próprias faltas -- dado
-- auto-declarado, não tem "professor confirma" nesta primeira versão.
create policy faltas_select on public.faltas
  for select to authenticated
  using (aluno_id = (select auth.uid()));

create policy faltas_insert on public.faltas
  for insert to authenticated
  with check (aluno_id = (select auth.uid()));

create policy faltas_delete on public.faltas
  for delete to authenticated
  using (aluno_id = (select auth.uid()));
