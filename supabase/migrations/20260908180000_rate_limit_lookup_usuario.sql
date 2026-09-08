-- Achado na auditoria de segurança (advisor `anon_security_definer_function_
-- executable` + revisão manual de IDOR/enumeração): `email_por_nome_usuario`
-- é uma RPC `security definer` chamável por QUALQUER pessoa sem sessão
-- (precisa ser assim -- é o que resolve @usuário -> e-mail antes do login,
-- ver `signIn` em `src/features/auth/api.ts`), mas devolvia o e-mail de
-- verdade pra qualquer @usuário adivinhado, sem limite nenhum de tentativas.
-- Como o público é majoritariamente menor de idade, alguém rodando uma
-- lista de @usuários comuns/nomes de colegas conseguia colher e-mails reais
-- em massa (enumeração + vazamento de PII, não só "username taken/free" que
-- `nome_usuario_disponivel` já expõe de propósito).
--
-- Corrigido com rate limit por IP de verdade -- não dá pra fazer isso só no
-- app (quem ataca não passa pelo app) nem só pelo Postgres sem contexto de
-- requisição, então usa o header que a própria borda do Supabase (Cloudflare)
-- injeta, `cf-connecting-ip` -- testado de verdade via curl direto no
-- `/rest/v1/rpc`, diferente de `x-forwarded-for` (que em tese o próprio
-- cliente pode tentar forjar), esse é posto pela Cloudflare e não pelo
-- chamador.
create table if not exists private.tentativas_rate_limit (
  id bigserial primary key,
  operacao text not null,
  chave text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_tentativas_rate_limit_lookup
  on private.tentativas_rate_limit (operacao, chave, criado_em);

create or replace function private.aplica_rate_limit(p_operacao text, p_limite int, p_janela interval)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text;
  v_contagem int;
begin
  v_chave := coalesce(
    (current_setting('request.headers', true)::json ->> 'cf-connecting-ip'),
    'sem-ip'
  );

  delete from private.tentativas_rate_limit
  where operacao = p_operacao and chave = v_chave and criado_em < now() - p_janela;

  select count(*) into v_contagem
  from private.tentativas_rate_limit
  where operacao = p_operacao and chave = v_chave;

  if v_contagem >= p_limite then
    raise exception 'Muitas tentativas -- espera um pouco antes de tentar de novo.';
  end if;

  insert into private.tentativas_rate_limit (operacao, chave) values (p_operacao, v_chave);
end;
$$;

-- Era `language sql stable` -- precisa virar `plpgsql` (não mais STABLE,
-- já que agora escreve no log de tentativas) pra poder chamar o rate limit
-- antes de resolver o e-mail.
create or replace function public.email_por_nome_usuario(p_nome_usuario text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.aplica_rate_limit('email_por_nome_usuario', 20, interval '10 minutes');
  return (select email from public.profiles where nome_usuario = lower(trim(p_nome_usuario)));
end;
$$;

-- Mesma proteção aqui, limite mais generoso (chamada a cada tecla digitada
-- no campo de @usuário do cadastro, ver `nomeUsuarioDisponivel` no app) --
-- o objetivo não é travar o autocomplete normal, é travar um script varrendo
-- milhares de nomes.
create or replace function public.nome_usuario_disponivel(p_nome_usuario text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.aplica_rate_limit('nome_usuario_disponivel', 60, interval '5 minutes');
  return not exists (
    select 1 from public.profiles where nome_usuario = lower(trim(p_nome_usuario))
  );
end;
$$;
