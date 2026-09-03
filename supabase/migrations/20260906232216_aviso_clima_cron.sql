-- Roda a cada 4h: a Edge Function aviso-clima consulta o Open-Meteo pra
-- cada escola com latitude/longitude cadastrada e cria um aviso tipo
-- 'trajeto' quando a previsão passa o limite configurado na escola
-- (brief 6.1). Mesma chave anon do trigger de push acima — pública, não é
-- segredo.
select cron.schedule(
  'aviso-clima-periodico',
  '0 */4 * * *',
  $$
  select net.http_post(
    url := 'https://njzstudshifdjdqwbqsa.supabase.co/functions/v1/aviso-clima',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenN0dWRzaGlmZGpkcXdicXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTA4NjQsImV4cCI6MjEwNDI4Njg2NH0.9U6u-1exVOHpyoHgNeT__CUsIko9U66QBGKHqY3gQK8'
    ),
    body := '{}'::jsonb
  );
  $$
);
