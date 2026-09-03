-- Histórico do chat com IA por aluno+matéria (brief 6.2: "Guarde o
-- histórico por aluno no Supabase — sem isso a 'sugestão de plano de
-- estudo' não tem memória de conversa anterior"). Só a Edge Function
-- chat-estudo escreve aqui (com a service role key, que ignora RLS) —
-- authenticated só tem policy de leitura, então não dá pra um cliente
-- forjar uma mensagem "assistente".
create type public.papel_mensagem_ia as enum ('usuario', 'assistente');

create table public.chat_ia_mensagens (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  materia_id uuid not null references public.materias (id) on delete cascade,
  papel public.papel_mensagem_ia not null,
  conteudo text not null check (char_length(btrim(conteudo)) > 0),
  criado_em timestamptz not null default now()
);

create index chat_ia_mensagens_aluno_materia_idx
  on public.chat_ia_mensagens (aluno_id, materia_id, criado_em);

alter table public.chat_ia_mensagens enable row level security;

create policy chat_ia_mensagens_select on public.chat_ia_mensagens
  for select to authenticated
  using (aluno_id = auth.uid());
