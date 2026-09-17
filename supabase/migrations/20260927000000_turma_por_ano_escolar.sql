-- Pedido do usuário: "tira as turmas deixe so o ano escolar mesmo" —
-- remove a escolha de turma específica (ex.: "Turma A"/"Turma B", com
-- dono e pedido de entrada) do onboarding. Daqui pra frente, turma_id
-- do aluno é resolvido automaticamente por escola+ano (uma turma
-- compartilhada por combinação, sem dono, entrada direta) em vez de
-- escolhida manualmente numa lista.

-- Limpa o único grupo escola+ano que já tinha duas turmas (dado de
-- seed — confirmado via SQL antes desta migration que nenhum aluno
-- estava matriculado em nenhuma das duas) pra poder criar o índice
-- único abaixo sem violar dado existente.
delete from public.salas_chat where turma_id = 'f6349cb3-0885-4496-bdda-da2cce50d1ef';
delete from public.turmas where id = 'f6349cb3-0885-4496-bdda-da2cce50d1ef';

create unique index turmas_escola_serie_ano_unico on public.turmas (escola_id, serie_ano);

-- Resolve (ou cria) a turma da combinação escola+ano e já matricula o
-- aluno nela numa única operação atômica — substitui o fluxo antigo de
-- "escolher uma turma existente" + "pedir entrada" (`concluirOnboarding`/
-- `pedirEntradaNaTurma`, sem mais uso no onboarding a partir de agora).
-- `security definer` porque criar turma exige a policy de insert
-- (`criado_por = auth.uid()`), mas aqui a turma nasce sem dono
-- (`criado_por` fica null de propósito — é compartilhada por
-- escola+ano, não pertence a quem entrou primeiro).
create function public.entrar_turma_por_ano(
  p_escola_id uuid,
  p_serie_ano text,
  p_numero_cartao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turma_id uuid;
begin
  insert into public.turmas (escola_id, nome, serie_ano)
  values (p_escola_id, p_serie_ano, p_serie_ano)
  on conflict (escola_id, serie_ano) do update set nome = turmas.nome
  returning id into v_turma_id;

  update public.profiles
  set escola_id = p_escola_id, turma_id = v_turma_id, numero_cartao_estudante = p_numero_cartao
  where id = auth.uid();

  return v_turma_id;
end;
$$;

grant execute on function public.entrar_turma_por_ano(uuid, text, text) to authenticated;
