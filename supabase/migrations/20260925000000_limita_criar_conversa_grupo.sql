-- Auditoria de segurança avançada pedida pelo usuário — achado: `criar_conversa_grupo`
-- não tinha limite nenhum de tamanho pro array de participantes nem rate
-- limit. Um usuário autenticado podia (a) mandar um array gigante de
-- participantes numa chamada só (negação de serviço barata: cada item
-- vira um INSERT) ou (b) criar dezenas de grupos por segundo pra floodar
-- convite de grupo em outros alunos — a única defesa hoje era o bloqueio
-- manual entre duas contas específicas, que não ajuda contra alguém que
-- nunca bloqueou ninguém.
--
-- Fix: limite de 50 participantes por grupo (generoso pra turma inteira)
-- + rate limit de 10 grupos criados por usuário a cada 10 minutos.

-- Permite passar a chave do rate limit explicitamente em vez de sempre
-- ler o IP do cabeçalho da requisição — necessário aqui pra limitar
-- `criar_conversa_grupo` POR USUÁRIO (não por IP: um IP de escola/wifi
-- compartilhado não pode penalizar todo mundo atrás dele por causa de um
-- usuário só). Chamadas existentes com 3 argumentos continuam lendo o
-- cabeçalho normalmente — compatível com `email_por_nome_usuario` e
-- `nome_usuario_disponivel`, que não mudam aqui.
create or replace function private.aplica_rate_limit(
  p_operacao text,
  p_limite integer,
  p_janela interval,
  p_chave_explicita text default null
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_chave text;
  v_contagem int;
begin
  v_chave := coalesce(
    p_chave_explicita,
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

create or replace function public.criar_conversa_grupo(p_nome text, p_participantes_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = 'public'
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

  if p_participantes_ids is not null and array_length(p_participantes_ids, 1) > 50 then
    raise exception 'Um grupo pode ter no máximo 50 participantes de uma vez.';
  end if;

  -- Chave explícita = o próprio usuário (não o IP): limitar por IP
  -- penalizaria uma escola inteira atrás do mesmo NAT/wifi por causa de
  -- um usuário só; por usuário é o escopo certo pra "não crie grupo
  -- demais rápido demais".
  perform private.aplica_rate_limit('criar_conversa_grupo', 10, interval '10 minutes', auth.uid()::text);

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
