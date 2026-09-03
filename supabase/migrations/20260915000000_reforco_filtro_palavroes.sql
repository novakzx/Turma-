-- Reforço do filtro de palavrões/insultos (pedido explícito do
-- usuário: "aumente o nivel da protecao contra palavroes e insultos
-- procuro por protecao de abreviamento de palavroes tambem", com o
-- site indo ao ar dia 20). A versão anterior (migration
-- `filtro_palavroes`) casava a palavra literal com `\y...\y` — passava
-- reto por qualquer ofuscação simples ("p0rr4", "p.o.r.r.a",
-- "poooorra"). Substituído por um padrão letra-a-letra tolerante a
-- leetspeak + separador opcional entre letras, espelhando
-- `src/lib/filtroPalavroes.ts` (mantenha as duas em sincronia).
--
-- Fronteira de palavra por lookahead/lookbehind (`(?<!...)`/`(?!...)`),
-- não `\y` — mesmo motivo documentado no lado TypeScript: o último
-- caractere batido por uma classe leetspeak pode ser um símbolo (`@`,
-- `!`, `$`) que não conta como "letra" pro `\y` do Postgres, e nesses
-- casos a fronteira nunca fechava (palavra escapava inteira). Postgres
-- ARE suporta lookaround (`(?=re)`/`(?!re)`/`(?<=re)`/`(?<!re)`), só
-- não com o mesmo atalho `\b`/`\y` baseado em classe de "word char".

create or replace function private.classe_leet(p_letra text)
returns text
language sql
immutable
as $$
  select case p_letra
    when 'a' then '[a4@]'
    when 'e' then '[e3]'
    when 'i' then '[i1!]'
    when 'o' then '[o0]'
    when 'u' then '[uv]'
    when 's' then '[s5$z]'
    when 'g' then '[g9]'
    when 'b' then '[b8]'
    else '[' || p_letra || ']'
  end;
$$;

-- Letras acentuadas relevantes em PT (mesmo conjunto do lado
-- TypeScript) — usar uma faixa `à-ÿ` incluiria `÷` (U+00F7, o símbolo
-- de divisão cai bem no meio dessa faixa Latin-1), por isso a lista é
-- explícita em vez de faixa.
create or replace function private.padrao_ofuscado(p_palavra text)
returns text
language plpgsql
immutable
as $$
declare
  v_letras_acentuadas constant text := 'áàâãäçéèêëíìîïóòôõöúùûü';
  v_classe_nao_letra text := '[^a-z' || v_letras_acentuadas || '0-9]';
  v_base text := lower(p_palavra);
  v_padrao text := '';
  v_char text;
  i int;
begin
  for i in 1 .. length(v_base) loop
    v_char := substr(v_base, i, 1);
    -- Descarta caractere que não é letra na palavra original (ex.: o
    -- hífen de "foda-se") — o separador opcional entre letras já cobre
    -- esse espaço.
    continue when v_char !~ ('[a-z' || v_letras_acentuadas || ']');

    if v_padrao <> '' then
      v_padrao := v_padrao || v_classe_nao_letra || '{0,2}';
    end if;
    v_padrao := v_padrao || private.classe_leet(v_char) || '+';
  end loop;

  return '(?<![a-z' || v_letras_acentuadas || '])' || v_padrao ||
         '(?![a-z' || v_letras_acentuadas || '])';
end;
$$;

create or replace function private.censurar_texto(p_texto text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  -- Mesma lista de `src/lib/filtroPalavroes.ts` — mantenha as duas em
  -- sincronia se for editar uma. "foda-se"/"fodase" continuam
  -- redundantes com "foda" de propósito (documentação), mesmo o
  -- separador opcional já cobrindo o caso sozinho.
  v_palavras text[] := array[
    'porra', 'merda', 'caralho', 'puta', 'fdp', 'foda-se', 'fodase',
    'foda', 'fodido', 'fodida', 'cabrao', 'cabrão', 'arrombado',
    'cuzao', 'cuzão', 'boceta', 'picha', 'viado', 'desgraca',
    'desgraça',
    -- Insultos — lista curta e conservadora de propósito: evita
    -- palavras de uso ambíguo/comum demais no dia a dia escolar
    -- ("burro", "gordo", "lixo") e não inclui "bicha" (calão homofóbico
    -- comum, mas também a palavra corriqueira pra "fila" em PT-PT —
    -- incluir geraria falso positivo o tempo todo). Evoluir esta lista
    -- é decisão de moderação de conteúdo — revise com a coordenação.
    'idiota', 'imbecil', 'estupido', 'estúpido', 'estupida', 'estúpida',
    'retardado', 'retardada', 'vagabundo', 'vagabunda', 'vadia',
    'piranha', 'corno', 'corna', 'otario', 'otário', 'otaria', 'otária',
    'babaca', 'panasca', 'maricas', 'boiola'
  ];
  v_palavra text;
  v_resultado text := p_texto;
begin
  if p_texto is null then
    return null;
  end if;

  foreach v_palavra in array v_palavras loop
    v_resultado := regexp_replace(
      v_resultado,
      private.padrao_ofuscado(v_palavra),
      -- Marcador de tamanho fixo (não do tamanho do trecho batido) —
      -- de propósito, ver comentário equivalente no lado TypeScript:
      -- não vazar o tamanho da palavra ofuscada original, e evita
      -- precisar calcular o tamanho do trecho batido dentro de um só
      -- `regexp_replace` (não dá, de qualquer forma).
      '****',
      'gi'
    );
  end loop;

  return v_resultado;
end;
$$;
