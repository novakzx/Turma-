-- Pedido do usuário: cadastro/login sem e-mail nenhum, só nome de
-- usuário + senha. O Supabase Auth exige *algum* e-mail internamente
-- pra criar a conta (não tem cadastro "username puro" nativo), então o
-- cliente passa a gerar um e-mail sintético (`<usuario>.<timestamp>@
-- turmamais.internal`) na hora do cadastro — nunca mostrado, nunca
-- digitado por ninguém, só existe pra satisfazer o auth.users.email.
--
-- Login por senha do Supabase (`signInWithPassword`) só aceita e-mail,
-- não usuário — então o cliente precisa resolver "nome de usuário" pro
-- e-mail sintético correspondente antes de chamar signIn. Quem ainda
-- não tem sessão não pode consultar `profiles` (RLS exige
-- authenticated), daí o mesmo padrão já usado em
-- `nome_usuario_disponivel`: uma RPC `security definer` bem estreita,
-- que só devolve esse e-mail sintético — nunca dado sensível de
-- verdade (aliás, ao contrário de um e-mail real, essa string não tem
-- valor nenhum fora do sistema, então expor pra `anon` é seguro).
create function public.email_por_nome_usuario(p_nome_usuario text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where nome_usuario = lower(trim(p_nome_usuario));
$$;

grant execute on function public.email_por_nome_usuario(text) to anon, authenticated;

-- "Alterar e-mail" (Configurações) deixou de fazer sentido — não existe
-- e-mail real pra trocar. A UI foi removida; a função de auth
-- (`atualizarEmail`) também.
