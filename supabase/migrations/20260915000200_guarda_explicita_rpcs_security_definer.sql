-- Endurecimento (pedido explícito do usuário: "nivel empresa
-- internacional", site indo ao ar). O linter de segurança do Supabase
-- (`anon_security_definer_function_executable`) apontou, corretamente,
-- que estas quatro funções SECURITY DEFINER são chamáveis por `anon` —
-- isso é intencional (RPC pensado pra ser chamado por quem já tem
-- sessão, mas o `grant execute` de RPC do PostgREST por padrão libera
-- pra `anon`/`authenticated` igual). Hoje, sem sessão, `auth.uid()`
-- retorna null e a chamada falha de qualquer forma (violação de
-- NOT NULL/FK ao tentar inserir `profile_id = null`) — só que isso é
-- proteção "por acidente", não por intenção explícita. Adiciona um
-- guard explícito no topo de cada uma: falha rápido com mensagem clara
-- em vez de depender de uma constraint de outra tabela pra barrar.
create or replace function public.criar_conversa_direta(p_outro_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conversa_id uuid;
  v_ja_me_segue boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if p_outro_id = auth.uid() then
    raise exception 'Não dá pra criar uma conversa consigo mesmo.';
  end if;

  if exists (
    select 1 from public.bloqueios
    where (bloqueador_id = auth.uid() and bloqueado_id = p_outro_id)
       or (bloqueador_id = p_outro_id and bloqueado_id = auth.uid())
  ) then
    raise exception 'Não é possível iniciar conversa com esse usuário.';
  end if;

  select c.id into v_conversa_id
  from public.conversas c
  where c.tipo = 'direta'
    and exists (select 1 from public.conversas_participantes cp where cp.conversa_id = c.id and cp.profile_id = auth.uid())
    and exists (select 1 from public.conversas_participantes cp where cp.conversa_id = c.id and cp.profile_id = p_outro_id)
  limit 1;

  if v_conversa_id is not null then
    return v_conversa_id;
  end if;

  select exists (
    select 1 from public.seguidores where seguidor_id = p_outro_id and seguido_id = auth.uid()
  ) into v_ja_me_segue;

  insert into public.conversas (tipo, criado_por) values ('direta', auth.uid())
  returning id into v_conversa_id;

  insert into public.conversas_participantes (conversa_id, profile_id, pedido_aceito)
  values (v_conversa_id, auth.uid(), true);

  insert into public.conversas_participantes (conversa_id, profile_id, pedido_aceito)
  values (v_conversa_id, p_outro_id, v_ja_me_segue);

  return v_conversa_id;
end;
$$;

create or replace function public.criar_conversa_grupo(p_nome text, p_participantes_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conversa_id uuid;
  v_participante_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if p_nome is null or trim(p_nome) = '' then
    raise exception 'Dê um nome pro grupo.';
  end if;

  insert into public.conversas (tipo, nome, criado_por) values ('grupo', trim(p_nome), auth.uid())
  returning id into v_conversa_id;

  insert into public.conversas_participantes (conversa_id, profile_id, papel, pedido_aceito)
  values (v_conversa_id, auth.uid(), 'admin', true);

  foreach v_participante_id in array p_participantes_ids loop
    if v_participante_id <> auth.uid()
       and not exists (
         select 1 from public.bloqueios
         where (bloqueador_id = auth.uid() and bloqueado_id = v_participante_id)
            or (bloqueador_id = v_participante_id and bloqueado_id = auth.uid())
       )
    then
      insert into public.conversas_participantes (conversa_id, profile_id, papel, pedido_aceito)
      values (v_conversa_id, v_participante_id, 'membro', true)
      on conflict (conversa_id, profile_id) do nothing;
    end if;
  end loop;

  return v_conversa_id;
end;
$$;

create or replace function public.adicionar_participante_grupo(p_conversa_id uuid, p_novo_participante_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not exists (select 1 from public.conversas where id = p_conversa_id and tipo = 'grupo') then
    raise exception 'Essa conversa não é um grupo.';
  end if;

  if not exists (
    select 1 from public.conversas_participantes
    where conversa_id = p_conversa_id and profile_id = auth.uid() and papel = 'admin'
  ) then
    raise exception 'Só o dono ou admins do grupo podem adicionar gente.';
  end if;

  if exists (
    select 1 from public.bloqueios
    where (bloqueador_id = auth.uid() and bloqueado_id = p_novo_participante_id)
       or (bloqueador_id = p_novo_participante_id and bloqueado_id = auth.uid())
  ) then
    raise exception 'Não é possível adicionar esse usuário.';
  end if;

  insert into public.conversas_participantes (conversa_id, profile_id, papel, pedido_aceito)
  values (p_conversa_id, p_novo_participante_id, 'membro', true)
  on conflict (conversa_id, profile_id) do nothing;
end;
$$;

create or replace function public.responder_pedido_entrada_turma(p_pedido_id uuid, p_aprovar boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_turma_id uuid;
  v_profile_id uuid;
  v_dono uuid;
  v_escola_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

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
