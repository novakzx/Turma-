-- Dispara a Edge Function notificar-aviso a cada INSERT em avisos (manual
-- ou automático de trajeto, o trigger não diferencia — ambos merecem
-- push). Autentica com a chave anon (é uma chave pública, protegida por
-- RLS/verify_jwt, não é segredo — a mesma que já vive no bundle do app).
-- A Edge Function usa a service role key (injetada automaticamente pelo
-- runtime, não passa por aqui) pra consultar profiles ignorando RLS.
create function private.notificar_aviso_criado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://njzstudshifdjdqwbqsa.supabase.co/functions/v1/notificar-aviso',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenN0dWRzaGlmZGpkcXdicXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTA4NjQsImV4cCI6MjEwNDI4Njg2NH0.9U6u-1exVOHpyoHgNeT__CUsIko9U66QBGKHqY3gQK8'
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

revoke execute on function private.notificar_aviso_criado() from public, authenticated;

create trigger trg_notificar_aviso_criado
  after insert on public.avisos
  for each row execute function private.notificar_aviso_criado();
