-- Assinatura Turma+ (pedido do usuário): R$2,99/mês via Stripe Checkout,
-- desbloqueia IA sem limite diário/rajada (ver `chat-estudo/index.ts`) e
-- um selo de "verificado" no perfil.
--
-- Igual ao padrão já usado pra `assinatura_push_web`: nenhuma dessas
-- colunas entra no GRANT UPDATE de `authenticated` (nem aqui, nem em
-- migration nenhuma daqui pra frente) — só a Edge Function do webhook
-- do Stripe (service role, nunca o app) pode escrever nelas. Sem isso,
-- qualquer usuário logado poderia se "assinar" sozinho com um UPDATE
-- direto na tabela.
alter table public.profiles
  add column assinatura_ativa boolean not null default false,
  add column assinatura_valido_ate timestamptz,
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

create unique index profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.profiles.assinatura_ativa is
  'Fonte da verdade pra "IA sem limites" + selo de verificado. Só escrita pelo webhook do Stripe (service role) — nunca pelo app.';
