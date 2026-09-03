-- BotaoSilenciar calculava "agora + N horas" com Date.now() do CLIENTE e
-- mandava o timestamp já pronto pro update — um relógio de dispositivo
-- errado (nada incomum: fuso, hora do sistema desconfigurada, ou o
-- clock deste próprio ambiente de teste, que ficou 4 dias atrás do
-- servidor) grava um silenciado_ate que já nasce expirado, sem erro
-- nenhum. "Agora" pra esse cálculo só pode vir do servidor.
--
-- security invoker (padrão): roda com o papel de quem chamou, então
-- continua sujeito à policy profiles_update_moderacao (só staff) e ao
-- trigger trg_profiles_guard_moderacao — não abre nenhum atalho novo,
-- só tira o "agora" das mãos do cliente.
create function public.silenciar_usuario(p_perfil_id uuid, p_horas numeric)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles
  set silenciado_ate = now() + (p_horas * interval '1 hour')
  where id = p_perfil_id;
$$;

grant execute on function public.silenciar_usuario(uuid, numeric) to authenticated;
