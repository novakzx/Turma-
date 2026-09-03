-- Precisa ser sua própria migration: `ALTER TYPE ... ADD VALUE` não
-- pode ser usado na mesma transação em que o valor novo é referenciado
-- (Postgres recusa com "unsafe use of new value of enum type").
alter type public.tipo_conteudo_denuncia add value 'mensagem_direta';
