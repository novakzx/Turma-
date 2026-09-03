-- Fase 9, parte 2: verificação de estudante no cadastro (brief original,
-- seção 3: "garantir que somente estudantes consigam se registrar").
--
-- Abordagem escolhida com o usuário: e-mail institucional da escola +
-- número do cartão de estudante. Nenhum dos dois é verificável de
-- verdade sem integração com o sistema oficial da escola (fora do
-- escopo do MVP, seção 11 do brief) — então isto é uma barreira de
-- entrada (dificulta cadastro de quem não é da escola), não uma prova
-- criptográfica de identidade. Documentado aqui pra não vender como
-- mais forte do que é.
--
-- `dominio_email` fica null até alguém preencher manualmente (Supabase
-- Studio, como já é o padrão pra dado administrativo neste projeto) —
-- sem isso, a checagem de e-mail simplesmente não roda pra essa escola
-- (silenciosamente permissivo, não silenciosamente destrutivo).
alter table public.escolas
  add column dominio_email text;

alter table public.profiles
  add column numero_cartao_estudante text;

grant update (numero_cartao_estudante) on public.profiles to authenticated;
