/**
 * Filtro de palavrões e insultos (brief seção 7: "Filtro básico de
 * linguagem ofensiva antes de bloquear em regra de negociação mais
 * sofisticada — comece simples, documente que dá pra evoluir").
 *
 * A censura de verdade acontece no banco, num trigger `BEFORE INSERT
 * OR UPDATE` em `posts`/`post_comentarios`/`mensagens_chat`/
 * `mensagens_diretas` (ver migration `filtro_palavroes` +
 * `reforco_filtro_palavroes`) — um filtro só aqui no cliente é
 * decorativo, porque qualquer requisição direta pra API passaria reto.
 * Essa cópia em TypeScript existe pra ter a regra testada (`npm test`
 * cobra teste de lógica de negócio real) e documentada num só lugar de
 * fácil leitura — **mantenha as duas listas e o mesmo algoritmo de
 * ofuscação em sincronia se for editar uma** (a versão SQL replica
 * `CLASSES_LEET`/a construção do padrão letra-a-letra abaixo).
 *
 * Reforço contra abreviação/ofuscação (pedido explícito: "protecao de
 * abreviamento de palavroes"): em vez de casar a palavra literal, cada
 * letra vira uma classe de caracteres que aceita as substituições
 * leetspeak mais comuns (0↔o, 1/!↔i, 3↔e, 4/@↔a, 5/$↔s) e aceita
 * qualquer separador entre as letras (espaço, ponto, hífen, `_`, `*`
 * — até 2 por vez, pra não estourar a frase inteira). Isso pega
 * "p0rr4", "p.o.r.r.a", "p o r r a" e "poooorra" com o mesmo padrão,
 * sem precisar de uma entrada nova por variação.
 */
const PALAVRAS_PROIBIDAS = [
  // Palavrões
  'porra',
  'merda',
  'caralho',
  'puta',
  'fdp',
  'foda-se',
  'fodase',
  'foda',
  'fodido',
  'fodida',
  'cabrao',
  'cabrão',
  'arrombado',
  'cuzao',
  'cuzão',
  'boceta',
  'picha',
  'viado',
  'desgraca',
  'desgraça',
  // Insultos (pedido explícito: "protecao... contra palavroes e
  // insultos", não só linguagem chula). Lista deliberadamente curta e
  // conservadora — evita palavras de uso ambíguo/comum demais no dia a
  // dia (ex.: "burro", "gordo", "lixo" também aparecem em contexto
  // totalmente inofensivo, o que geraria falso positivo constante numa
  // rede de escola) e **não inclui "bicha"**, apesar de ser calão
  // homofóbico comum, porque em PT-PT é também a palavra corriqueira
  // pra "fila" ("fazer bicha no refeitório") — incluir geraria falso
  // positivo o tempo todo. Evoluir essa lista é decisão de moderação de
  // conteúdo, não só técnica — revise com a coordenação periodicamente.
  'idiota',
  'imbecil',
  'estupido',
  'estúpido',
  'estupida',
  'estúpida',
  'retardado',
  'retardada',
  'vagabundo',
  'vagabunda',
  'vadia',
  'piranha',
  'corno',
  'corna',
  'otario',
  'otário',
  'otaria',
  'otária',
  'babaca',
  'panasca',
  'maricas',
  'boiola',
] as const;

/** Letras com substituição leetspeak comum — mapeadas pra uma classe de
 * caracteres que aceita a letra original OU o(s) dígito(s)/símbolo(s)
 * usado(s) no lugar dela. Letras fora deste mapa (consoantes sem
 * substituto óbvio, como 'p', 't', 'r'...) usam só a própria letra. */
const CLASSES_LEET: Record<string, string> = {
  a: '[a4@]',
  e: '[e3]',
  i: '[i1!]',
  o: '[o0]',
  u: '[uv]',
  s: '[s5$z]',
  g: '[g9]',
  b: '[b8]',
};

/** Letras acentuadas relevantes em PT — tratadas como "letra" pro fim
 * de fronteira de palavra e separador (senão "cabrão" quebraria a
 * detecção de fronteira bem no acento). */
const LETRAS_ACENTUADAS = 'áàâãäçéèêëíìîïóòôõöúùûü';

function escaparRegex(caractere: string): string {
  return caractere.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function letraParaClasse(letra: string): string {
  return CLASSES_LEET[letra] ?? `[${escaparRegex(letra)}]`;
}

/** Constrói, por palavra proibida, um regex tolerante a ofuscação: cada
 * letra vira uma classe leetspeak-aware seguida de `+` (aceita
 * repetição — "poooorra"), com um separador opcional (0 a 2 caracteres
 * que não sejam letra/dígito) entre elas. Caracteres que não são letra
 * na palavra original (ex.: o hífen de "foda-se") são descartados —
 * o separador opcional já cobre esse espaço.
 *
 * Fronteira de palavra por *lookaround* (`(?<!letra)`/`(?!letra)`), não
 * `\b` — achado testando "put@": `\b` depende de `\w` (letra/dígito/`_`
 * do próprio motor de regex), e o último caractere batido por
 * `[a4@]+` pode ser `@`, que não é `\w`; nesse caso `\b` nunca fecha
 * (dois lados "não-\w" nunca formam fronteira) e a palavra escapava
 * inteira sem censura. Checando explicitamente "não é letra" dos dois
 * lados evita essa dependência do alfabeto embutido do motor de regex. */
function construirPadraoOfuscado(palavraBase: string): RegExp {
  const classeLetra = `a-z${LETRAS_ACENTUADAS}`;
  const classeNaoLetra = `[^${classeLetra}0-9]`;
  const letras = palavraBase
    .toLowerCase()
    .split('')
    .filter((c) => /[a-z]/.test(c) || LETRAS_ACENTUADAS.includes(c));
  const partes = letras.map((letra) => `${letraParaClasse(letra)}+`);
  const padrao = partes.join(`${classeNaoLetra}{0,2}`);
  return new RegExp(`(?<![${classeLetra}])${padrao}(?![${classeLetra}])`, 'gi');
}

export function censurarTexto<T extends string | null | undefined>(texto: T): T {
  if (!texto) return texto;
  let resultado: string = texto;
  for (const palavra of PALAVRAS_PROIBIDAS) {
    const regex = construirPadraoOfuscado(palavra);
    // Substitui por um marcador de tamanho fixo (não pelo tamanho do
    // trecho batido) — de propósito: não vazar o tamanho da palavra
    // ofuscada original é uma pequena vantagem a mais contra quem tenta
    // adivinhar a partir da contagem de asteriscos, e mantém o mesmo
    // comportamento simples de replicar no trigger do Postgres (que não
    // tem como calcular o tamanho do trecho batido dentro de um único
    // `regexp_replace`).
    resultado = resultado.replace(regex, '****');
  }
  return resultado as T;
}
