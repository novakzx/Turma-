-- Rate limit da tradução automática (pedido do usuário) — mesma
-- preocupação de custo real do `chat-estudo` (API paga por chamada), mas
-- sem uma tabela de histórico natural pra contar em cima (tradução não
-- precisa guardar o texto traduzido depois de mostrado uma vez). Essa
-- tabela só registra "usuário X pediu tradução às Y horas" — a Edge
-- Function `traduzir-texto` conta linhas recentes antes de chamar a
-- Gemini, mesmo princípio do limite do chat-estudo.
create table public.traducoes_uso (
  id bigserial primary key,
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index idx_traducoes_uso_janela on public.traducoes_uso (aluno_id, criado_em);

alter table public.traducoes_uso enable row level security;

-- Só leitura do próprio registro (nem isso é usado pelo app hoje — é só
-- pra não deixar a tabela sem policy nenhuma, ver regra do CLAUDE.md).
-- Escrita só pela Edge Function via service role (ignora RLS) — nenhuma
-- policy de insert/update/delete pra `authenticated`/`anon` de propósito.
create policy traducoes_uso_select on public.traducoes_uso
  for select using (aluno_id = auth.uid());
