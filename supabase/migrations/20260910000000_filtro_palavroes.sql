-- Fase 14: filtro de palavrões (brief original, seção 7: "Filtro
-- básico de linguagem ofensiva antes de bloquear em regra de
-- negociação mais sofisticada — comece simples, documente que dá pra
-- evoluir"). Censura automática em post, comentário, mensagem de sala
-- e mensagem direta — os quatro tipos de conteúdo com texto livre do
-- usuário no app.
--
-- Decisão de arquitetura: a censura roda num trigger `BEFORE
-- INSERT OR UPDATE`, não só no cliente. Um filtro só no app (JS) é
-- decorativo — qualquer requisição direta pra API (como as usadas
-- pra testar RLS neste projeto inteiro) passaria reto. Rodando no
-- banco, é impossível contornar sem burlar a própria RLS.
--
-- Lista curta de propósito (palavrões óbvios em PT-PT, sem tentar
-- cobrir gírias regionais ou variações leetspeak) — é o "comece
-- simples" que o brief pediu. Evoluir isso é trocar o array abaixo (ou
-- migrar pra uma tabela, se precisar editar sem nova migration).
create or replace function private.censurar_texto(p_texto text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  -- "filho da puta" não precisa de entrada própria — a palavra "puta"
  -- sozinha já casa e censura antes de chegar numa frase assim
  -- (achado testando de verdade: uma entrada de frase depois de uma
  -- palavra que já é substring dela nunca é alcançada).
  v_palavras text[] := array[
    'porra', 'merda', 'caralho', 'puta', 'fdp', 'foda-se', 'fodase',
    'foda', 'fodido', 'fodida', 'cabrao', 'cabrão', 'arrombado',
    'cuzao', 'cuzão', 'boceta', 'picha', 'viado', 'desgraca',
    'desgraça'
  ];
  v_palavra text;
  v_resultado text := p_texto;
begin
  if p_texto is null then
    return null;
  end if;

  foreach v_palavra in array v_palavras loop
    -- `\y` é a fronteira de palavra do dialeto de regex do Postgres
    -- (ARE) — o equivalente ao `\b` do PCRE/JS.
    v_resultado := regexp_replace(
      v_resultado,
      '\y' || v_palavra || '\y',
      repeat('*', length(v_palavra)),
      'gi'
    );
  end loop;

  return v_resultado;
end;
$$;

create function private.aplicar_censura()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.conteudo := private.censurar_texto(new.conteudo);
  return new;
end;
$$;

create trigger censura_posts
  before insert or update on public.posts
  for each row execute function private.aplicar_censura();

create trigger censura_post_comentarios
  before insert or update on public.post_comentarios
  for each row execute function private.aplicar_censura();

create trigger censura_mensagens_chat
  before insert or update on public.mensagens_chat
  for each row execute function private.aplicar_censura();

create trigger censura_mensagens_diretas
  before insert or update on public.mensagens_diretas
  for each row execute function private.aplicar_censura();
