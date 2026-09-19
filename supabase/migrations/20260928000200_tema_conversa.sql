-- Tema visual da conversa (pedido do usuário — anexou print de app de
-- mensagens com fundo em gradiente colorido por conversa, "deixe tipo
-- assim os temas"). `tema` é só uma CHAVE (ex.: 'balas', 'noite') que o
-- cliente resolve pra cores/gradiente — a paleta de cada tema mora no
-- app (`src/features/mensagens/temas.ts`), não no banco, então trocar
-- uma cor não precisa de migration nova. `null` = sem tema (visual
-- padrão de sempre).
alter table public.conversas
  add column tema text;

-- Participante da conversa pode mudar o tema (compartilhado pros dois
-- lados, igual o app de referência) — só essa coluna importa aqui,
-- não existe outro campo editável em `conversas` hoje. Mesmo padrão de
-- `conversas_select`: subquery em `conversas_participantes`.
create policy conversas_update on public.conversas
  for update to authenticated
  using (
    exists (
      select 1 from public.conversas_participantes cp
      where cp.conversa_id = conversas.id and cp.profile_id = auth.uid()
    )
  );

grant update (tema) on public.conversas to authenticated;
