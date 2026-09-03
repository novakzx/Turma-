-- "Mural de avisos em tempo real" (brief 6.1) precisa da tabela na
-- publicação supabase_realtime pra Realtime propagar o INSERT pro
-- cliente (RLS de avisos continua valendo — só chega quem já teria
-- acesso via SELECT).
alter publication supabase_realtime add table public.avisos;
