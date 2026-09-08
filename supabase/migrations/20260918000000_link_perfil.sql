-- "Link na bio" (pedido do usuário) — um link opcional que o aluno
-- mostra no próprio perfil (Instagram, portfólio, o que quiser).
-- Constraint restringe a http/https e a um tamanho razoável: além de
-- validação no cliente (`normalizarLinkPerfil`), garante no banco que
-- ninguém guarda um esquema perigoso (`javascript:` etc.) mesmo
-- chamando a API direto, sem passar pela validação do app.
alter table public.profiles
  add column link text;

alter table public.profiles
  add constraint profiles_link_formato check (
    link is null
    or (char_length(link) <= 200 and link ~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+')
  );

grant update (link) on public.profiles to authenticated;
