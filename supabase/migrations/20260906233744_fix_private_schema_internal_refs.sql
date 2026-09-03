-- Bug real, achado testando de verdade: ALTER FUNCTION ... SET SCHEMA
-- atualiza quem aponta pra essas funções via policy (RLS guarda o
-- vínculo por OID), mas NÃO atualiza chamadas *dentro* de outras funções
-- que citavam o nome com o schema antigo (`public.current_papel()`,
-- `public.is_staff()`) — corpo de função SQL/plpgsql resolve isso por
-- nome de novo a cada chamada, não por OID. Resultado: is_staff() e
-- profiles_guard_moderacao() quebravam com "function public.xxx() does
-- not exist" assim que alguém tentava publicar um aviso.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_papel() in ('professor', 'coordenacao');
$$;

create or replace function private.profiles_guard_moderacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.silenciado_ate is distinct from old.silenciado_ate then
    if not private.is_staff() then
      raise exception 'Apenas professor ou coordenação pode silenciar/dessilenciar um usuário.';
    end if;
  end if;
  return new;
end;
$$;
