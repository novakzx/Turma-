-- Achado na auto-revisão do que foi mudado nesta própria auditoria (a
-- "segunda olhada" pedida pelo usuário, procurando problema introduzido
-- pela correção anterior): `private.aplica_rate_limit` (migration
-- `rate_limit_lookup_usuario`) só apaga linhas antigas da chave (IP) que
-- está sendo consultada naquele momento -- um IP que aparece uma vez e
-- nunca mais volta deixa a própria linha pra sempre em
-- `private.tentativas_rate_limit`. Sem limpeza nenhuma, isso cresce sem
-- parar (não é vulnerabilidade de acesso, é esgotamento de armazenamento a
-- longo prazo). Cron diário apagando qualquer linha com mais de 1 dia --
-- bem mais que a maior janela usada hoje (10 min) -- resolve sem precisar
-- de lógica nova nas funções que já leem/escrevem essa tabela.
select cron.schedule(
  'limpeza_rate_limit_diaria',
  '0 4 * * *',
  $$ delete from private.tentativas_rate_limit where criado_em < now() - interval '1 day'; $$
);
