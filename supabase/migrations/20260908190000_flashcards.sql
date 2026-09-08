-- Flashcards com repetição espaçada (pedido explícito do usuário). Aluno
-- cria um cartão (manualmente, ou "Criar flashcard" a partir de uma
-- resposta da IA no chat de estudo) e revisa os que estão "devidos"
-- (`proxima_revisao <= hoje`). O algoritmo de repetição em si (SM-2
-- simplificado) é lógica pura em `src/features/flashcards/regras.ts`,
-- testável sem banco — aqui só guarda o resultado de cada revisão.
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  pergunta text not null check (char_length(btrim(pergunta)) > 0),
  resposta text not null check (char_length(btrim(resposta)) > 0),
  intervalo_dias integer not null default 1,
  fator_facilidade numeric not null default 2.5,
  proxima_revisao date not null default current_date,
  criado_em timestamptz not null default now()
);

create index idx_flashcards_devidos on public.flashcards (aluno_id, proxima_revisao);
create index idx_flashcards_materia on public.flashcards (materia_id);

alter table public.flashcards enable row level security;

-- Só o próprio aluno vê/cria/edita/apaga os próprios flashcards — não é
-- conteúdo de turma nem staff tem motivo pra ver o cartão de revisão de
-- ninguém (é uma ferramenta de estudo pessoal, diferente do chat com IA
-- que já é por matéria/turma).
create policy flashcards_select on public.flashcards
  for select using (aluno_id = auth.uid());

create policy flashcards_insert on public.flashcards
  for insert with check (aluno_id = auth.uid());

create policy flashcards_update on public.flashcards
  for update using (aluno_id = auth.uid());

create policy flashcards_delete on public.flashcards
  for delete using (aluno_id = auth.uid());
