-- O brief 6.4 pede post tipo 'evento' "com data", mas o modelo de dados
-- original (seção 5) não tinha coluna nenhuma pra isso — mesma lacuna que
-- avisos.data_evento já resolvia, replicada aqui.
alter table public.posts add column data_evento date;
