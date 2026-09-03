-- Pedido do usuário: cadastro passa a coletar idade (pra comparar com
-- o ano letivo escolhido no onboarding e perguntar sobre repetência
-- quando não bate), aceite de Termos de Uso e confirmação de que
-- pais/responsáveis estão cientes da criação da conta — child safety
-- é requisito deste projeto desde o brief original.
--
-- Sem grant novo de INSERT: a tabela já tem INSERT liberado por
-- padrão pra `authenticated` em todas as colunas (só UPDATE que
-- precisa de grant por coluna nesse projeto — ver `profiles_update_self`
-- + grants explícitos nas migrations anteriores). `nome_usuario` já
-- tinha UPDATE liberado (perfil_editavel) — continua editável depois
-- do cadastro; os campos novos abaixo só são gravados uma vez, no
-- cadastro, e não precisam de UPDATE liberado por enquanto (documentado
-- como limitação: dá pra abrir edição depois se precisar).
alter table public.profiles
  add column idade smallint,
  add column anos_reprovados smallint[] not null default '{}',
  add column termos_aceitos_em timestamptz,
  add column consentimento_responsavel boolean not null default false;

comment on column public.profiles.idade is 'Idade informada no cadastro. Comparada com o ano letivo escolhido no onboarding.';
comment on column public.profiles.anos_reprovados is 'Anos/séries que o aluno relatou ter reprovado, quando a idade não bate com o ano letivo escolhido.';

-- `anos_reprovados` é a exceção que precisa de UPDATE liberado: a
-- pergunta "você reprovou de ano?" só faz sentido depois que a turma
-- (série/ano) é escolhida no onboarding — um passo depois do cadastro
-- que já criou a linha em `profiles`. Os outros três campos são
-- gravados uma vez só, no INSERT do cadastro (já liberado por padrão),
-- e não precisam de UPDATE.
grant update (anos_reprovados) on public.profiles to authenticated;

-- Checagem de nome de usuário disponível ANTES do cadastro terminar
-- de verdade: `nome_usuario` só é gravado em `profiles` no primeiro
-- login (depois de confirmar e-mail — ver `fetchOrCreateProfile`), e
-- sem sessão ainda (`anon`) não dá pra consultar `profiles` (RLS exige
-- `authenticated`). Sem essa checagem, alguém escolhendo um @usuário
-- já usado só descobriria o erro no primeiro login, preso numa tela
-- de carregamento sem UI de erro nenhuma (gap real do fluxo de auth,
-- fora do escopo resolver agora — essa função evita cair nele).
-- `security definer` roda com bypass de RLS; só devolve um boolean,
-- não vaza nenhum outro dado do perfil de ninguém.
create function public.nome_usuario_disponivel(p_nome_usuario text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where nome_usuario = lower(trim(p_nome_usuario))
  );
$$;

grant execute on function public.nome_usuario_disponivel(text) to anon, authenticated;
