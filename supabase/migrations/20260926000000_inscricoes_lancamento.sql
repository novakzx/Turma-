-- Pedido do usuário: página "em breve" no site (web) até o lançamento,
-- com inscrição de acesso antecipado (nome, telefone, e-mail) e um
-- painel separado (senha simples, fora do login normal) pra ele ver
-- quem se inscreveu.
create table public.inscricoes_lancamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 30),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  criado_em timestamptz not null default now()
);

-- Um e-mail só entra uma vez na lista -- evita duplicidade de quem
-- reenvia o formulário sem perceber que já tinha se inscrito.
create unique index inscricoes_lancamento_email_key on public.inscricoes_lancamento (lower(email));
create index inscricoes_lancamento_criado_em_idx on public.inscricoes_lancamento (criado_em desc);

alter table public.inscricoes_lancamento enable row level security;

-- Qualquer visitante (chave anônima) pode se inscrever -- é o próprio
-- objetivo da página pública. De propósito NÃO existe policy de
-- select/update/delete pra anon/authenticated: RLS nega por padrão o
-- que não tem policy, então só a service role (usada pela Edge
-- Function `inscricoes-lancamento`, que exige a senha de admin no
-- header) consegue listar ou apagar inscrições.
create policy inscricoes_lancamento_insert on public.inscricoes_lancamento
  for insert to anon, authenticated
  with check (true);
