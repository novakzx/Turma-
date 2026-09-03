-- Turma+ — schema inicial (Fase 0)
--
-- Cobre o modelo de dados do brief (seção 5) com os ajustes necessários pra
-- RLS funcionar de verdade: colunas de escopo (escola_id) em tabelas que
-- precisam ser filtradas por escola mesmo quando o brief não listava essa
-- coluna explicitamente, e duas colunas de configuração por escola
-- (nota_maxima, limites de clima) porque o brief pede que esses valores
-- não fiquem hardcoded no app (seções 6.1 e 6.3).
--
-- escolas, turmas e materias não têm política de escrita pra authenticated:
-- a seção 11 do brief marca "painel de administração" como fora do escopo
-- do MVP e resolve isso via Supabase Studio (que roda como owner e não
-- passa pelas policies abaixo).

create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

create type public.papel_usuario as enum ('aluno', 'professor', 'coordenacao');

create type public.tipo_aviso as enum (
  'greve', 'feriado', 'suspensao', 'mudanca_horario',
  'prova', 'trabalho', 'comunicado', 'trajeto'
);

create type public.origem_aviso as enum ('manual', 'automatico');

create type public.tipo_post as enum ('texto', 'foto', 'evento', 'lembrete');

create type public.tipo_sala_chat as enum ('turma', 'materia', 'assunto');

create type public.tipo_conteudo_denuncia as enum ('post', 'comentario', 'mensagem');

create type public.status_denuncia as enum ('pendente', 'revisado', 'resolvido');

-- ============================================================
-- TABELAS
-- ============================================================

create table public.escolas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  latitude double precision,
  longitude double precision,
  -- Escala de nota configurável por escola (brief 6.3) — 0-10 é só o default.
  nota_maxima numeric not null default 10 check (nota_maxima > 0),
  -- Limites do aviso automático de trajeto (brief 6.1), usados pela Edge
  -- Function agendada da Fase 2. Ficam aqui pra cada escola poder ajustar.
  limite_chuva_percentual integer not null default 70 check (limite_chuva_percentual between 0 and 100),
  limite_temperatura_celsius numeric not null default 35,
  criado_em timestamptz not null default now()
);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id) on delete cascade,
  nome text not null,
  serie_ano text not null,
  criado_em timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) > 0),
  email text not null,
  papel public.papel_usuario not null default 'aluno',
  escola_id uuid references public.escolas (id) on delete set null,
  turma_id uuid references public.turmas (id) on delete set null,
  foto_url text,
  push_token text,
  -- Moderação (brief 7): silenciar usuário até uma data/hora. NULL = não
  -- silenciado. Só professor/coordenacao pode mudar isso — ver trigger
  -- profiles_guard_moderacao mais abaixo.
  silenciado_ate timestamptz,
  criado_em timestamptz not null default now()
);

create table public.materias (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  nome text not null,
  professor_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles (id) on delete set null,
  escola_id uuid not null references public.escolas (id) on delete cascade,
  -- NULL = aviso pra escola toda. Preenchido = só pra essa turma.
  -- Esse campo é o que decide o escopo do push (brief 6.1).
  turma_id uuid references public.turmas (id) on delete cascade,
  tipo public.tipo_aviso not null,
  origem public.origem_aviso not null default 'manual',
  titulo text not null check (char_length(btrim(titulo)) > 0),
  descricao text,
  data_evento date,
  criado_em timestamptz not null default now(),
  -- Só o cron da Fase 2 cria avisos tipo 'trajeto', e só com origem
  -- 'automatico'; todo o resto é sempre 'manual'. Mantém a separação que o
  -- brief pede entre aviso automático de clima e aviso manual.
  constraint trajeto_e_sempre_automatico check (
    (tipo = 'trajeto' and origem = 'automatico') or
    (tipo <> 'trajeto' and origem = 'manual')
  )
);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  materia_id uuid not null references public.materias (id) on delete cascade,
  nome text not null,
  peso numeric not null check (peso > 0),
  -- nota é opcional: uma avaliação "pendente" ainda não tem nota lançada,
  -- é exatamente o caso que a calculadora (Fase 3) precisa resolver.
  nota numeric check (nota >= 0),
  data date,
  criado_em timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles (id) on delete set null,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  tipo public.tipo_post not null default 'texto',
  conteudo text,
  midia_url text,
  criado_em timestamptz not null default now()
);

create table public.post_curtidas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (post_id, autor_id)
);

create table public.post_comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete set null,
  conteudo text not null check (char_length(btrim(conteudo)) > 0),
  criado_em timestamptz not null default now()
);

create table public.salas_chat (
  id uuid primary key default gen_random_uuid(),
  -- Não tá no brief, mas sem isso não dá pra escopar sala tipo 'assunto'
  -- (que não pertence a uma turma específica) por escola na RLS.
  escola_id uuid not null references public.escolas (id) on delete cascade,
  tipo public.tipo_sala_chat not null,
  turma_id uuid references public.turmas (id) on delete cascade,
  materia_id uuid references public.materias (id) on delete cascade,
  nome text not null,
  -- NULL nas salas de turma/matéria: elas nascem de um trigger (ver
  -- abaixo), não de uma ação de aluno.
  criado_por uuid references public.profiles (id) on delete set null,
  trancada boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint sala_turma_tem_turma_id check (tipo <> 'turma' or turma_id is not null),
  constraint sala_materia_tem_materia_id check (tipo <> 'materia' or materia_id is not null)
);

create table public.mensagens_chat (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas_chat (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete cascade,
  conteudo text not null check (char_length(btrim(conteudo)) > 0),
  -- Soft delete: "apagar mensagem" (brief 6.5) esconde o conteúdo sem
  -- destruir a linha, então o histórico de moderação continua íntegro.
  apagada boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  tipo_conteudo public.tipo_conteudo_denuncia not null,
  -- Sem FK: aponta pra posts, post_comentarios ou mensagens_chat dependendo
  -- de tipo_conteudo (referência polimórfica, checada em código, não em SQL).
  conteudo_id uuid not null,
  denunciante_id uuid references public.profiles (id) on delete set null,
  -- Não tá no brief, mas necessário pra RLS mostrar a fila de denúncias só
  -- pra staff da escola certa sem precisar resolver o polimorfismo em SQL.
  escola_id uuid not null references public.escolas (id) on delete cascade,
  motivo text not null check (char_length(btrim(motivo)) > 0),
  status public.status_denuncia not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES (colunas usadas o tempo todo nas policies de RLS abaixo)
-- ============================================================

create index profiles_escola_id_idx on public.profiles (escola_id);
create index profiles_turma_id_idx on public.profiles (turma_id);
create index avisos_escola_id_idx on public.avisos (escola_id);
create index avisos_turma_id_idx on public.avisos (turma_id);
create index avaliacoes_aluno_id_idx on public.avaliacoes (aluno_id);
create index posts_turma_id_idx on public.posts (turma_id);
create index post_curtidas_post_id_idx on public.post_curtidas (post_id);
create index post_comentarios_post_id_idx on public.post_comentarios (post_id);
create index salas_chat_escola_id_idx on public.salas_chat (escola_id);
create index mensagens_chat_sala_id_idx on public.mensagens_chat (sala_id);
create index denuncias_escola_id_idx on public.denuncias (escola_id);
create index denuncias_status_idx on public.denuncias (status);

-- ============================================================
-- FUNÇÕES DE APOIO PRA RLS
--
-- SECURITY DEFINER + dono = owner da migration (bypassa RLS de profiles),
-- então dá pra ler o papel/escola/turma do usuário logado sem recursão de
-- policy (profiles não pode ter uma policy que chama uma função que lê
-- profiles através de uma policy...).
-- ============================================================

create function public.current_papel()
returns public.papel_usuario
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.profiles where id = auth.uid();
$$;

create function public.current_escola_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select escola_id from public.profiles where id = auth.uid();
$$;

create function public.current_turma_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select turma_id from public.profiles where id = auth.uid();
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_papel() in ('professor', 'coordenacao');
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Impede que o próprio aluno se dessilencie (ou se silencie) mexendo no
-- próprio perfil. papel/escola_id/turma_id já são protegidos por GRANT
-- (mais abaixo), mas silenciado_ate precisa continuar editável por
-- professor/coordenacao no perfil de outra pessoa, então RLS de linha não
-- resolve sozinho — só um trigger pega esse caso.
create function public.profiles_guard_moderacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.silenciado_ate is distinct from old.silenciado_ate then
    if not public.is_staff() then
      raise exception 'Apenas professor ou coordenação pode silenciar/dessilenciar um usuário.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_moderacao
  before update on public.profiles
  for each row execute function public.profiles_guard_moderacao();

-- Sala de chat da turma nasce sozinha quando a turma é criada.
create function public.criar_sala_turma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.salas_chat (escola_id, tipo, turma_id, nome)
  values (new.escola_id, 'turma', new.id, new.nome);
  return new;
end;
$$;

create trigger trg_criar_sala_turma
  after insert on public.turmas
  for each row execute function public.criar_sala_turma();

-- Sala de chat da matéria nasce sozinha quando a matéria é criada.
create function public.criar_sala_materia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escola_id uuid;
begin
  select escola_id into v_escola_id from public.turmas where id = new.turma_id;
  insert into public.salas_chat (escola_id, tipo, turma_id, materia_id, nome)
  values (v_escola_id, 'materia', new.turma_id, new.id, new.nome);
  return new;
end;
$$;

create trigger trg_criar_sala_materia
  after insert on public.materias
  for each row execute function public.criar_sala_materia();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.escolas enable row level security;
alter table public.turmas enable row level security;
alter table public.profiles enable row level security;
alter table public.materias enable row level security;
alter table public.avisos enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.posts enable row level security;
alter table public.post_curtidas enable row level security;
alter table public.post_comentarios enable row level security;
alter table public.salas_chat enable row level security;
alter table public.mensagens_chat enable row level security;
alter table public.denuncias enable row level security;

-- escolas / turmas / materias: leitura liberada pra qualquer usuário
-- autenticado (onboarding precisa listar escola e turma antes do perfil
-- ter escola_id/turma_id preenchido). Escrita fica pro Supabase Studio.
create policy escolas_select on public.escolas
  for select to authenticated using (true);

create policy turmas_select on public.turmas
  for select to authenticated using (true);

create policy materias_select on public.materias
  for select to authenticated using (true);

-- profiles: cada um vê o próprio perfil, os colegas de turma (feed/chat
-- precisam mostrar nome e foto de quem postou) e a staff da própria escola
-- (pra moderação). Escrita: só o próprio dono, e só nas colunas liberadas
-- pelo GRANT abaixo (papel/escola_id/turma_id não entram nem aí).
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or turma_id = public.current_turma_id()
    or (public.is_staff() and escola_id = public.current_escola_id())
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_moderacao on public.profiles
  for update to authenticated
  using (public.is_staff() and escola_id = public.current_escola_id())
  with check (public.is_staff() and escola_id = public.current_escola_id());

revoke update on public.profiles from authenticated;
grant update (nome, foto_url, push_token, silenciado_ate) on public.profiles to authenticated;

-- avisos: só lê o que é da própria escola e (escola toda ou a própria
-- turma) — isso é literalmente o escopo que decide quem recebe o push.
-- Só professor/coordenacao publica aviso manual; 'trajeto' só entra via
-- service role (a Edge Function agendada), nunca pela policy abaixo.
create policy avisos_select on public.avisos
  for select to authenticated
  using (
    escola_id = public.current_escola_id()
    and (turma_id is null or turma_id = public.current_turma_id())
  );

create policy avisos_insert on public.avisos
  for insert to authenticated
  with check (
    public.is_staff()
    and autor_id = auth.uid()
    and escola_id = public.current_escola_id()
    and tipo <> 'trajeto'
  );

create policy avisos_update on public.avisos
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid() and tipo <> 'trajeto');

create policy avisos_delete on public.avisos
  for delete to authenticated
  using (autor_id = auth.uid() or (public.is_staff() and escola_id = public.current_escola_id()));

-- avaliacoes: é a calculadora pessoal do aluno (brief 6.3), não o diário
-- oficial da escola (isso é explicitamente fora do escopo — brief 11).
-- Só o próprio aluno lê/escreve as próprias notas.
create policy avaliacoes_all on public.avaliacoes
  for all to authenticated
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid());

-- posts: mural da turma. Aluno/professor só vê e posta na própria turma;
-- coordenacao enxerga qualquer turma da própria escola (fila de moderação).
create policy posts_select on public.posts
  for select to authenticated
  using (
    turma_id = public.current_turma_id()
    or (
      public.current_papel() = 'coordenacao'
      and turma_id in (select id from public.turmas where escola_id = public.current_escola_id())
    )
  );

create policy posts_insert on public.posts
  for insert to authenticated
  with check (autor_id = auth.uid() and turma_id = public.current_turma_id());

create policy posts_update on public.posts
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());

create policy posts_delete on public.posts
  for delete to authenticated
  using (
    autor_id = auth.uid()
    or (
      public.is_staff()
      and turma_id in (select id from public.turmas where escola_id = public.current_escola_id())
    )
  );

-- post_curtidas / post_comentarios: mesma regra de visibilidade do post
-- pai — se não pode ver o post, não pode ver quem curtiu nem os
-- comentários dele.
create policy post_curtidas_select on public.post_curtidas
  for select to authenticated
  using (post_id in (select id from public.posts));

create policy post_curtidas_insert on public.post_curtidas
  for insert to authenticated
  with check (autor_id = auth.uid() and post_id in (select id from public.posts));

create policy post_curtidas_delete on public.post_curtidas
  for delete to authenticated
  using (autor_id = auth.uid());

create policy post_comentarios_select on public.post_comentarios
  for select to authenticated
  using (post_id in (select id from public.posts));

create policy post_comentarios_insert on public.post_comentarios
  for insert to authenticated
  with check (autor_id = auth.uid() and post_id in (select id from public.posts));

create policy post_comentarios_update on public.post_comentarios
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());

create policy post_comentarios_delete on public.post_comentarios
  for delete to authenticated
  using (
    autor_id = auth.uid()
    or (
      public.is_staff()
      and post_id in (
        select p.id from public.posts p
        join public.turmas t on t.id = p.turma_id
        where t.escola_id = public.current_escola_id()
      )
    )
  );

-- salas_chat: sala de turma/matéria só é visível pra quem é daquela turma;
-- sala de assunto é visível pra escola inteira (é o "espaço aberto" da
-- seção 6.5, mas ainda supervisionado — nunca é 1-a-1, brief seção 7).
-- Só sala tipo 'assunto' é criada pelo cliente; turma/materia nascem do
-- trigger acima.
create policy salas_chat_select on public.salas_chat
  for select to authenticated
  using (
    escola_id = public.current_escola_id()
    and (
      tipo = 'assunto'
      or (tipo = 'turma' and turma_id = public.current_turma_id())
      or (tipo = 'materia' and materia_id in (
        select id from public.materias where turma_id = public.current_turma_id()
      ))
    )
  );

create policy salas_chat_insert on public.salas_chat
  for insert to authenticated
  with check (
    tipo = 'assunto'
    and criado_por = auth.uid()
    and escola_id = public.current_escola_id()
  );

create policy salas_chat_update on public.salas_chat
  for update to authenticated
  using (public.is_staff() and escola_id = public.current_escola_id())
  with check (public.is_staff() and escola_id = public.current_escola_id());

-- mensagens_chat: só entra quem enxerga a sala (reusa a regra acima via
-- subquery), sala não pode estar trancada, e autor não pode estar
-- silenciado no momento do envio.
create policy mensagens_chat_select on public.mensagens_chat
  for select to authenticated
  using (
    sala_id in (select id from public.salas_chat)
    and (not apagada or public.is_staff())
  );

create policy mensagens_chat_insert on public.mensagens_chat
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and sala_id in (select id from public.salas_chat where not trancada)
    and not exists (
      select 1 from public.profiles
      where id = auth.uid() and silenciado_ate is not null and silenciado_ate > now()
    )
  );

-- Moderação só pode marcar apagada=true (soft delete); não edita conteúdo.
create policy mensagens_chat_moderacao on public.mensagens_chat
  for update to authenticated
  using (public.is_staff() and sala_id in (
    select id from public.salas_chat where escola_id = public.current_escola_id()
  ))
  with check (public.is_staff());

revoke update on public.mensagens_chat from authenticated;
grant update (apagada) on public.mensagens_chat to authenticated;

-- denuncias: quem denunciou vê a própria denúncia; staff vê (e resolve)
-- a fila inteira da própria escola (brief 7: "chega numa fila que
-- professor/coordenacao vê").
create policy denuncias_select on public.denuncias
  for select to authenticated
  using (
    denunciante_id = auth.uid()
    or (public.is_staff() and escola_id = public.current_escola_id())
  );

create policy denuncias_insert on public.denuncias
  for insert to authenticated
  with check (denunciante_id = auth.uid() and escola_id = public.current_escola_id());

create policy denuncias_update on public.denuncias
  for update to authenticated
  using (public.is_staff() and escola_id = public.current_escola_id())
  with check (public.is_staff() and escola_id = public.current_escola_id());
