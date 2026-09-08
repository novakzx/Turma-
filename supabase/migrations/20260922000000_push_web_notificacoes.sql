-- Push notifications de verdade (pedido do usuário) — via Web Push
-- (RFC 8291/8292), não pelo Expo Push Service: o projeto ainda não tem
-- `eas init` rodado (precisa de conta Expo de verdade, não dá pra fazer
-- por aqui — ver README), então o token nativo (`profiles.push_token`,
-- já existente) nunca teve pra onde ir. O app hoje é majoritariamente
-- acessado pelo navegador/PWA (suaturma.vercel.app), e navegador
-- consegue receber Web Push direto, sem precisar de conta nenhuma nova.
--
-- `assinatura_push_web` guarda o `PushSubscription` do navegador
-- (endpoint + chaves p256dh/auth) — formato bem diferente de um
-- ExponentPushToken, por isso é coluna própria, não reaproveita
-- `push_token` (evita ambiguidade de formato na hora de enviar).
alter table public.profiles add column assinatura_push_web jsonb;
grant update (assinatura_push_web) on public.profiles to authenticated;

-- Helper compartilhado por todos os triggers de notificação abaixo —
-- mesmo padrão de segurança já usado em `notificar_aviso_criado`
-- (migration `endurece_edge_functions_internas`): segredo real vem do
-- Vault (`webhook_internal_secret`, já existe, reaproveitado aqui em
-- vez de criar um segundo), a anon key só satisfaz o `verify_jwt` de
-- plataforma (não é o mecanismo de segurança de verdade).
create function private.notificar_push(
  p_perfil_ids uuid[],
  p_titulo text,
  p_corpo text,
  p_dados jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if p_perfil_ids is null or array_length(p_perfil_ids, 1) is null then
    return;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'webhook_internal_secret';

  perform net.http_post(
    url := 'https://njzstudshifdjdqwbqsa.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenN0dWRzaGlmZGpkcXdicXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTA4NjQsImV4cCI6MjEwNDI4Njg2NH0.9U6u-1exVOHpyoHgNeT__CUsIko9U66QBGKHqY3gQK8',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'perfilIds', to_jsonb(p_perfil_ids),
      'titulo', p_titulo,
      'corpo', p_corpo,
      'dados', p_dados
    )
  );
end;
$$;

revoke execute on function private.notificar_push(uuid[], text, text, jsonb) from public, authenticated;

-- Resolve @usuário -> id de perfil (mesmo regex de `src/lib/mencoes.ts`,
-- duplicado aqui em SQL pela mesma razão de sempre: Postgres não importa
-- TypeScript). `stable` (não `immutable`) porque lê de `profiles`.
create function private.resolver_mencoes(p_texto text)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select array_agg(distinct p.id)
  from (
    select (regexp_matches(p_texto, '@([a-z0-9_]{3,20})', 'g'))[1] as handle
  ) m
  join public.profiles p on p.nome_usuario = m.handle;
$$;

revoke execute on function private.resolver_mencoes(text) from public, authenticated;

-- 1) Nova mensagem direta -> notifica todo mundo na conversa, menos
-- quem mandou. Corpo vira um rótulo genérico pra foto/áudio (mesma
-- convenção já usada na pré-visualização da lista de conversas, ver
-- `LinhaConversa` em `chat.tsx`) em vez de tentar descrever mídia.
create function private.notificar_nova_mensagem_direta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_autor text;
  v_destinatarios uuid[];
  v_corpo text;
begin
  if new.apagada then
    return new;
  end if;

  select nome into v_nome_autor from public.profiles where id = new.autor_id;

  select array_agg(profile_id) into v_destinatarios
  from public.conversas_participantes
  where conversa_id = new.conversa_id and profile_id != new.autor_id;

  v_corpo := case
    when new.midia_tipo = 'imagem' then 'Enviou uma foto'
    when new.midia_tipo = 'audio' then 'Enviou um áudio'
    else coalesce(left(new.conteudo, 140), '')
  end;

  perform private.notificar_push(
    v_destinatarios,
    coalesce(v_nome_autor, 'Nova mensagem'),
    v_corpo,
    jsonb_build_object('tipo', 'mensagem_direta', 'conversaId', new.conversa_id)
  );
  return new;
end;
$$;

revoke execute on function private.notificar_nova_mensagem_direta() from public, authenticated;

create trigger trg_notificar_nova_mensagem_direta
  after insert on public.mensagens_diretas
  for each row execute function private.notificar_nova_mensagem_direta();

-- 2) Menção @usuário numa mensagem de sala.
create function private.notificar_mencao_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_autor text;
  v_mencionados uuid[];
begin
  if new.apagada or new.conteudo is null then
    return new;
  end if;

  select array_remove(private.resolver_mencoes(new.conteudo), new.autor_id) into v_mencionados;
  if v_mencionados is null then
    return new;
  end if;

  select nome into v_nome_autor from public.profiles where id = new.autor_id;

  perform private.notificar_push(
    v_mencionados,
    coalesce(v_nome_autor, 'Alguém') || ' mencionou você',
    left(new.conteudo, 140),
    jsonb_build_object('tipo', 'mencao_sala', 'salaId', new.sala_id)
  );
  return new;
end;
$$;

revoke execute on function private.notificar_mencao_sala() from public, authenticated;

create trigger trg_notificar_mencao_sala
  after insert on public.mensagens_chat
  for each row execute function private.notificar_mencao_sala();

-- 3) Menção @usuário num post do feed.
create function private.notificar_mencao_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_autor text;
  v_mencionados uuid[];
begin
  if new.conteudo is null then
    return new;
  end if;

  select array_remove(private.resolver_mencoes(new.conteudo), new.autor_id) into v_mencionados;
  if v_mencionados is null then
    return new;
  end if;

  select nome into v_nome_autor from public.profiles where id = new.autor_id;

  perform private.notificar_push(
    v_mencionados,
    coalesce(v_nome_autor, 'Alguém') || ' mencionou você',
    left(new.conteudo, 140),
    jsonb_build_object('tipo', 'mencao_post', 'postId', new.id)
  );
  return new;
end;
$$;

revoke execute on function private.notificar_mencao_post() from public, authenticated;

create trigger trg_notificar_mencao_post
  after insert on public.posts
  for each row execute function private.notificar_mencao_post();

-- 4) Comentário num post — menção dentro do comentário tem prioridade
-- (evita mandar duas notificações pro autor do post quando ele mesmo é
-- o mencionado: `array_remove` tira o autor do post da lista de "post
-- comentado" só quando ele já está nos mencionados).
create function private.notificar_comentario_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_autor text;
  v_post_autor_id uuid;
  v_mencionados uuid[];
  v_avisar_autor_post uuid[];
begin
  select autor_id into v_post_autor_id from public.posts where id = new.post_id;
  select nome into v_nome_autor from public.profiles where id = new.autor_id;

  select array_remove(private.resolver_mencoes(new.conteudo), new.autor_id) into v_mencionados;
  perform private.notificar_push(
    v_mencionados,
    coalesce(v_nome_autor, 'Alguém') || ' mencionou você',
    left(new.conteudo, 140),
    jsonb_build_object('tipo', 'mencao_comentario', 'postId', new.post_id)
  );

  if v_post_autor_id is not null
    and v_post_autor_id != new.autor_id
    and not (v_post_autor_id = any(coalesce(v_mencionados, array[]::uuid[])))
  then
    v_avisar_autor_post := array[v_post_autor_id];
    perform private.notificar_push(
      v_avisar_autor_post,
      coalesce(v_nome_autor, 'Alguém') || ' comentou no seu post',
      left(new.conteudo, 140),
      jsonb_build_object('tipo', 'comentario_post', 'postId', new.post_id)
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.notificar_comentario_post() from public, authenticated;

create trigger trg_notificar_comentario_post
  after insert on public.post_comentarios
  for each row execute function private.notificar_comentario_post();

-- 5) Curtida num post.
create function private.notificar_curtida_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_autor text;
  v_post_autor_id uuid;
begin
  select autor_id into v_post_autor_id from public.posts where id = new.post_id;
  if v_post_autor_id is null or v_post_autor_id = new.autor_id then
    return new;
  end if;

  select nome into v_nome_autor from public.profiles where id = new.autor_id;

  perform private.notificar_push(
    array[v_post_autor_id],
    coalesce(v_nome_autor, 'Alguém') || ' curtiu seu post',
    'Toca pra ver.',
    jsonb_build_object('tipo', 'curtida_post', 'postId', new.post_id)
  );
  return new;
end;
$$;

revoke execute on function private.notificar_curtida_post() from public, authenticated;

create trigger trg_notificar_curtida_post
  after insert on public.post_curtidas
  for each row execute function private.notificar_curtida_post();
