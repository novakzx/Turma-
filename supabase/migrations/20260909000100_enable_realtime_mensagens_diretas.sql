-- Mensagens diretas em tempo real (mesmo padrão de `mensagens_chat`) —
-- RLS continua valendo, só chega quem já teria acesso via SELECT.
alter publication supabase_realtime add table public.mensagens_diretas;
alter publication supabase_realtime add table public.conversas_participantes;
