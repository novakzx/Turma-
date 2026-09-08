-- CRÍTICO — achado na auditoria de segurança pedida pelo usuário:
-- `notificar-aviso` e `aviso-clima` são Edge Functions "internas" (só
-- deveriam ser chamadas pelo trigger de INSERT em `avisos` e pelo cron,
-- respectivamente), mas não tinham NENHUMA verificação de verdade —
-- `verify_jwt` (a proteção de plataforma do Supabase) aceita qualquer
-- JWT válido do projeto, e a chave usada era a **anon key**, que é
-- pública de propósito (vive no bundle do app, `EXPO_PUBLIC_SUPABASE_
-- ANON_KEY`). Ou seja: qualquer pessoa na internet, sabendo só a URL do
-- projeto (também pública), conseguia chamar `notificar-aviso` direto
-- com `escola_id`/`titulo`/`descricao` arbitrários e a função — rodando
-- com a SERVICE ROLE, ignorando RLS — mandava push notification de
-- conteúdo forjado pra TODOS os dispositivos daquela escola. Em um app
-- majoritariamente de menores de idade, isso é phishing/spam em escala,
-- não um detalhe.
--
-- Correção: um segredo de verdade (gerado aqui, nunca escrito em texto
-- puro neste arquivo — fica só cifrado no Vault) que a função passa a
-- exigir num header (`x-webhook-secret`) antes de fazer qualquer coisa
-- privilegiada. O trigger/cron busca o segredo do Vault em tempo de
-- execução; a Edge Function compara contra a variável de ambiente
-- `WEBHOOK_INTERNAL_SECRET` (configurada à parte, via
-- `supabase secrets set` — nunca fica no código nem na migration).
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'webhook_internal_secret',
  'Segredo compartilhado entre o trigger/cron e as Edge Functions internas (notificar-aviso, aviso-clima) -- ver migration endurece_edge_functions_internas.'
);

create or replace function private.notificar_aviso_criado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'webhook_internal_secret';

  perform net.http_post(
    url := 'https://njzstudshifdjdqwbqsa.supabase.co/functions/v1/notificar-aviso',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Continua presente (igual desde a migration `avisos_push_trigger`)
      -- só pra satisfazer o `verify_jwt` de plataforma, que segue ligado
      -- na função -- nunca foi o mecanismo de segurança de verdade (é a
      -- anon key, pública). Quem protege de verdade agora é o
      -- `x-webhook-secret` abaixo.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenN0dWRzaGlmZGpkcXdicXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTA4NjQsImV4cCI6MjEwNDI4Njg2NH0.9U6u-1exVOHpyoHgNeT__CUsIko9U66QBGKHqY3gQK8',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'id', new.id,
      'escola_id', new.escola_id,
      'turma_id', new.turma_id,
      'tipo', new.tipo,
      'titulo', new.titulo,
      'descricao', new.descricao
    )
  );
  return new;
end;
$$;
