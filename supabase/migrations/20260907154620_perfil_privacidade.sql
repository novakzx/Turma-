-- Configurações: privacidade da conta (público/privado). Default true
-- (público) — enforcement de verdade (esconder perfil de quem não é
-- staff/turma quando privado) entra junto com a busca global de perfil
-- nas próximas fases; por ora é só a coluna + o toggle na tela de
-- Configurações, gravável pelo próprio dono (mesmo grant de sempre).
alter table public.profiles add column publico boolean not null default true;

grant update (publico) on public.profiles to authenticated;
