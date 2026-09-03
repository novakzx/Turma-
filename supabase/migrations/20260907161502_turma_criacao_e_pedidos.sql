-- Fase 9: turma deixa de ser só institucional/pré-semeada — qualquer
-- usuário pode criar uma turma nova (ex.: grupo de estudo, turma que
-- não existia no seed). Turma continua vinculada a uma escola real
-- (decisão de segurança já tomada) — só a origem da turma que muda.
--
-- Turma institucional (criado_por is null, veio do seed) continua com
-- entrada direta (auto-serviço, como sempre foi — brief original nunca
-- pediu aprovação pra essas). Turma criada por usuário exige pedido +
-- aprovação do dono (ou de staff da escola, como rede de segurança) —
-- é a resposta explícita do usuário pra "só o dono ou admin adiciona
-- gente", sem abrir entrada livre por busca.
alter table public.turmas
  add column criado_por uuid references public.profiles (id) on delete set null;

create policy turmas_insert on public.turmas
  for insert to authenticated
  with check (criado_por = auth.uid());

create type public.status_pedido_turma as enum ('pendente', 'aprovado', 'recusado');

create table public.turma_pedidos_entrada (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.status_pedido_turma not null default 'pendente',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);

-- Só um pedido pendente por vez pra mesma turma+pessoa (depois de
-- recusado, dá pra pedir de novo — por isso o índice único é parcial,
-- só sobre "pendente").
create unique index turma_pedidos_pendente_unico
  on public.turma_pedidos_entrada (turma_id, profile_id)
  where status = 'pendente';

create index turma_pedidos_entrada_turma_id_idx on public.turma_pedidos_entrada (turma_id);

alter table public.turma_pedidos_entrada enable row level security;

create policy turma_pedidos_select on public.turma_pedidos_entrada
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.turmas t where t.id = turma_id and t.criado_por = auth.uid())
  );

create policy turma_pedidos_insert on public.turma_pedidos_entrada
  for insert to authenticated
  with check (profile_id = auth.uid());

-- profiles_select padrão só libera "mesma turma" ou staff da mesma
-- escola — quem pediu entrada ainda não tem turma_id nenhum (só ganha
-- depois de aprovado), então sem isso o dono da turma nunca vê o nome
-- de quem está pedindo entrada (RLS embutida no join vira null, UI cai
-- no fallback "Alguém"). Libera só o necessário: o profile de quem tem
-- pedido *pendente* numa turma que eu criei.
create policy profiles_select_pedido_pendente on public.profiles
  for select
  using (
    exists (
      select 1
      from public.turma_pedidos_entrada tp
      join public.turmas t on t.id = tp.turma_id
      where tp.profile_id = profiles.id
        and tp.status = 'pendente'
        and t.criado_por = auth.uid()
    )
  );

-- Sem policy de UPDATE pra authenticated de propósito — responder um
-- pedido (aprovar/recusar) só acontece pela função abaixo, que valida
-- "é o dono (ou staff da escola) de verdade" por dentro antes de mexer
-- em qualquer linha, e faz as duas escritas (pedido + profiles.turma_id)
-- numa transação só.
create function public.responder_pedido_entrada_turma(p_pedido_id uuid, p_aprovar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turma_id uuid;
  v_profile_id uuid;
  v_dono uuid;
  v_escola_id uuid;
begin
  select turma_id, profile_id into v_turma_id, v_profile_id
  from public.turma_pedidos_entrada
  where id = p_pedido_id and status = 'pendente';

  if not found then
    raise exception 'Pedido não encontrado ou já respondido.';
  end if;

  select criado_por, escola_id into v_dono, v_escola_id
  from public.turmas where id = v_turma_id;

  if auth.uid() is distinct from v_dono
     and not (private.is_staff() and private.current_escola_id() = v_escola_id) then
    raise exception 'Só o dono da turma (ou staff da escola) pode responder esse pedido.';
  end if;

  update public.turma_pedidos_entrada
  set status = (case when p_aprovar then 'aprovado' else 'recusado' end)::status_pedido_turma,
      respondido_em = now()
  where id = p_pedido_id;

  if p_aprovar then
    update public.profiles set turma_id = v_turma_id, escola_id = v_escola_id where id = v_profile_id;
  end if;
end;
$$;

grant execute on function public.responder_pedido_entrada_turma(uuid, boolean) to authenticated;
