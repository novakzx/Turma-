/**
 * Menção @usuário (pedido explícito do usuário) — puro parsing de texto,
 * sem banco nem componente aqui, pra ficar testável isoladamente (o
 * componente que renderiza de verdade, `TextoComMencoes`, usa isto por
 * baixo). Mesmo formato de @usuário já validado no cadastro
 * (`^[a-z0-9_]{3,20}$`, ver migration `cadastro_idade_termos_consentimento`).
 */

const REGEX_MENCAO_GLOBAL = /@([a-z0-9_]{3,20})/g;

export type TrechoTexto = { texto: string; mencao: string | null };

/** Lista só os @usuários mencionados, sem duplicar (útil pra quem quer
 * só saber "quem foi citado", sem precisar do texto completo). */
export function extrairMencoes(texto: string): string[] {
  const vistos = new Set<string>();
  for (const match of texto.matchAll(REGEX_MENCAO_GLOBAL)) {
    vistos.add(match[1]);
  }
  return [...vistos];
}

/** Quebra o texto em trechos alternando texto normal e menção — é o que
 * `TextoComMencoes` percorre pra montar os `<Text>` aninhados (React
 * Native não deixa estilizar uma "palavra dentro" de um `<Text>` sem
 * quebrar em nós separados). */
export function dividirEmTrechos(texto: string): TrechoTexto[] {
  const trechos: TrechoTexto[] = [];
  let ultimoIndice = 0;

  for (const match of texto.matchAll(REGEX_MENCAO_GLOBAL)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimoIndice) {
      trechos.push({ texto: texto.slice(ultimoIndice, inicio), mencao: null });
    }
    trechos.push({ texto: match[0], mencao: match[1] });
    ultimoIndice = inicio + match[0].length;
  }

  if (ultimoIndice < texto.length) {
    trechos.push({ texto: texto.slice(ultimoIndice), mencao: null });
  }

  return trechos;
}
