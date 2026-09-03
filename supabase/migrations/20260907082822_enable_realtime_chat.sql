-- "Mensagens em tempo real via Supabase Realtime" (brief 6.5) — sem isso
-- o cliente só veria mensagem nova dando refresh manual. RLS de
-- mensagens_chat continua valendo: só chega quem já teria acesso via
-- SELECT.
--
-- salas_chat também entra: precisa propagar ao vivo quando alguém tranca
-- uma sala (trancada=true) ou cria uma sala de assunto nova, senão outros
-- alunos da escola só veriam isso dando refresh na lista de salas.
alter publication supabase_realtime add table public.mensagens_chat;
alter publication supabase_realtime add table public.salas_chat;
