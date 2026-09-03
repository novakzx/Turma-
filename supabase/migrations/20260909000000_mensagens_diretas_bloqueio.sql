-- Fase 12: mensagens diretas. Decisão do usuário (documentada desde a
-- Fase 9): DM 1-a-1 aberta entre qualquer usuário do app, de qualquer
-- escola — dado que o público é majoritariamente menor de idade, isso
-- só entra com as mesmas salvaguardas que Instagram/TikTok usam pra
-- conta de menor: bloquear, denunciar (reaproveita `denuncias`), fila
-- de pedido pra quem não é seguido (como "solicitações de mensagem" do
-- Instagram), e staff com visibilidade só do CONTEÚDO DENUNCIADO — não
-- acesso geral à conversa, ao contrário do que já vale pra sala de
-- turma/matéria (mensagens_chat), que sempre foi um espaço coletivo,
-- não uma DM privada.

create table public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  bloqueador_id uuid not null references public.profiles (id) on delete cascade,
  bloqueado_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint bloqueios_nao_a_si_mesmo check (bloqueador_id <> bloqueado_id),
  constraint bloqueios_par_unico unique (bloqueador_id, bloqueado_id)
);

alter table public.bloqueios enable row level security;

-- Só vejo quem EU bloqueei — não quem me bloqueou (isso vazaria pro
-- bloqueado que ele foi bloqueado, o oposto do que bloquear deveria
-- fazer). A checagem "fulano me bloqueou" acontece só dentro das RPCs
-- abaixo (security definer), nunca exposta como leitura direta.
create policy bloqueios_select on public.bloqueios
  for select to authenticated
  using (bloqueador_id = auth.uid());

create policy bloqueios_insert on public.bloqueios
  for insert to authenticated
  with check (bloqueador_id = auth.uid());

create policy bloqueios_delete on public.bloqueios
  for delete to authenticated
  using (bloqueador_id = auth.uid());

grant select, insert, delete on public.bloqueios to authenticated;

create type public.tipo_conversa as enum ('direta', 'grupo');
create type public.papel_participante as enum ('membro', 'admin');

create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_conversa not null,
  nome text,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint conversas_grupo_tem_nome check (tipo = 'direta' or nome is not null)
);

alter table public.conversas enable row level security;

create table public.conversas_participantes (
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  papel public.papel_participante not null default 'membro',
  -- Pra DM: começa `false` pro destinatário quando quem manda não é
  -- seguido por ele (vira "Pedido" — solicitação de mensagem, brief
  -- seção 8); responder aceita sozinho (trigger abaixo). Grupo sempre
  -- entra com `true` — quem foi chamado pelo dono/admin não precisa
  -- "aceitar pedido", só pode sair depois se quiser (delete da própria
  -- linha).
  pedido_aceito boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (conversa_id, profile_id)
);

alter table public.conversas_participantes enable row level security;

create policy conversas_select on public.conversas
  for select to authenticated
  using (
    exists (
      select 1 from public.conversas_participantes cp
      where cp.conversa_id = conversas.id and cp.profile_id = auth.uid()
    )
  );

-- Sem policy de insert/update/delete pra `conversas` — tudo passa pelas
-- RPCs `security definer` abaixo, que validam bloqueio/permissão antes
-- de qualquer escrita.

-- Uma policy de `conversas_participantes` que faz subquery na própria
-- `conversas_participantes` (pra "outro participante consegue ver
-- linha de todo mundo da mesma conversa") vira recursão infinita — o
-- Postgres reavalia a RLS da subquery, que reavalia a RLS de novo, sem
-- fim ("infinite recursion detected in policy for relation
-- conversas_participantes", achado testando de verdade). Função
-- `security definer` quebra o ciclo: ela roda com bypass de RLS por
-- dentro, então não reaciona a própria policy que a chama.
create function private.sou_participante(p_conversa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversas_participantes
    where conversa_id = p_conversa_id and profile_id = auth.uid()
  );
$$;

create policy conversas_participantes_select on public.conversas_participantes
  for select to authenticated
  using (
    profile_id = auth.uid()
    or private.sou_participante(conversa_id)
  );

-- Só a própria linha, e só pra aceitar o próprio pedido pendente (não
-- dá pra virar admin sozinho por aqui — `papel` não tem grant de
-- update pra authenticated).
create policy conversas_participantes_update on public.conversas_participantes
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Sair do grupo/recusar o pedido: apagar a própria linha.
create policy conversas_participantes_delete on public.conversas_participantes
  for delete to authenticated
  using (profile_id = auth.uid());

grant select on public.conversas_participantes to authenticated;
grant update (pedido_aceito) on public.conversas_participantes to authenticated;
grant delete on public.conversas_participantes to authenticated;

create table public.mensagens_diretas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete set null,
  conteudo text not null,
  criado_em timestamptz not null default now(),
  apagada boolean not null default false
);

create index mensagens_diretas_conversa_id_idx on public.mensagens_diretas (conversa_id, criado_em);

alter table public.mensagens_diretas enable row level security;

-- Participante da conversa vê tudo (mesmo pendente — é o "preview" do
-- pedido, igual Instagram deixa ler antes de aceitar). Staff enxerga
-- só a mensagem específica que foi denunciada, da mesma escola —
-- nunca a conversa inteira: diferente da sala de turma/matéria
-- (espaço coletivo, staff sempre viu tudo), DM é 1-a-1 de verdade.
create policy mensagens_diretas_select on public.mensagens_diretas
  for select to authenticated
  using (
    exists (
      select 1 from public.conversas_participantes cp
      where cp.conversa_id = mensagens_diretas.conversa_id and cp.profile_id = auth.uid()
    )
    or (
      private.is_staff()
      and exists (
        select 1 from public.denuncias d
        where d.tipo_conteudo = 'mensagem_direta'
          and d.conteudo_id = mensagens_diretas.id
          and d.escola_id = private.current_escola_id()
      )
    )
  );

-- Checa bloqueio nos dois sentidos ignorando RLS de `bloqueios` — sem
-- isso, uma policy que faz `join bloqueios` direto só enxerga o
-- bloqueio que EU criei (`bloqueios_select` só libera
-- `bloqueador_id = auth.uid()`, de propósito, pra não vazar "fulano me
-- bloqueou"). Resultado, achado testando de verdade: quem foi
-- bloqueado continuava conseguindo mandar mensagem, porque o `NOT
-- EXISTS` não enxergava o bloqueio feito contra ele mesmo.
create function private.existe_bloqueio_entre(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.bloqueios
    where (bloqueador_id = p_a and bloqueado_id = p_b)
       or (bloqueador_id = p_b and bloqueado_id = p_a)
  );
$$;

-- Bloqueio em qualquer direção barra o envio, mesmo numa conversa já
-- existente de antes do bloqueio — não só na hora de criar.
create policy mensagens_diretas_insert on public.mensagens_diretas
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.conversas_participantes cp
      where cp.conversa_id = mensagens_diretas.conversa_id and cp.profile_id = auth.uid()
    )
    and not exists (
      select 1
      from public.conversas_participantes outro
      where outro.conversa_id = mensagens_diretas.conversa_id
        and outro.profile_id <> auth.uid()
        and private.existe_bloqueio_entre(outro.profile_id, auth.uid())
    )
  );

create policy mensagens_diretas_update on public.mensagens_diretas
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());

grant select, insert on public.mensagens_diretas to authenticated;
grant update (apagada) on public.mensagens_diretas to authenticated;

-- Responder um pedido pendente aceita sozinho — sem isso, quem recebeu
-- uma solicitação e respondeu direto (sem apertar "Aceitar" antes)
-- ficaria pra sempre na aba Pedidos.
create function private.aceitar_pedido_ao_responder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversas_participantes
  set pedido_aceito = true
  where conversa_id = new.conversa_id
    and profile_id = new.autor_id
    and pedido_aceito = false;
  return new;
end;
$$;

create trigger aceitar_pedido_ao_responder
  after insert on public.mensagens_diretas
  for each row
  execute function private.aceitar_pedido_ao_responder();

-- Cria (ou reaproveita) a conversa direta entre mim e `p_outro_id`.
-- Pedido começa aceito pros dois se o outro já me segue (relação de
-- confiança já existente); senão, fica pendente só pro lado dele —
-- resposta explícita do usuário: "coloque pra só o dono ou os admins
-- do grupo pode adicionar novas pessoas" (grupo) + fila de pedido pra
-- DM de quem não segue (brief seção 8).
create function public.criar_conversa_direta(p_outro_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversa_id uuid;
  v_ja_me_segue boolean;
begin
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

grant execute on function public.criar_conversa_direta(uuid) to authenticated;

-- Grupo: quem cria vira admin. Membros iniciais entram direto (o dono
-- escolheu chamar essa gente — sem fila de pedido, diferente da DM).
create function public.criar_conversa_grupo(p_nome text, p_participantes_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversa_id uuid;
  v_participante_id uuid;
begin
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

grant execute on function public.criar_conversa_grupo(text, uuid[]) to authenticated;

-- "Só o dono ou os admins do grupo pode adicionar novas pessoas"
-- (resposta explícita do usuário) — validado aqui dentro, não só
-- escondido na UI.
create function public.adicionar_participante_grupo(p_conversa_id uuid, p_novo_participante_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

grant execute on function public.adicionar_participante_grupo(uuid, uuid) to authenticated;
