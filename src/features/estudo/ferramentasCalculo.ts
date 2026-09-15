/**
 * Ferramentas de cálculo do Explicador — calculadora científica,
 * resolvedor de equação do 2.º grau e derivada de polinómios. Portado de
 * `services/tutor/math.js` do projeto de referência (`TurmaTestes-main`)
 * que o usuário mandou: mesmo parser por descida recursiva (sem
 * `eval`/`Function`, então nenhuma expressão do usuário roda como código
 * de verdade), mesma fórmula resolvente com passos explicados. Roda 100%
 * no cliente — não depende da Edge Function de IA (`chat-estudo`), então
 * funciona mesmo sem internet ou sem o app de IA responder.
 */

// Dígito sobrescrito (Unicode) → dígito normal, pra virar "^N" — achado
// testando ao vivo (usuário relatou "arrume as ferramentas... fácil
// uso e funcional"): a própria dica de erro do resolvedor de equação
// mostra "ax² + bx + c" (usa "²" de verdade), mas sem esta conversão o
// parser não reconhecia "²" nenhum — pior ainda, no resolvedor de
// equação isso não dava erro nenhum, só CALCULAVA ERRADO em silêncio
// (ex.: "x² - 5x + 6 = 0" virava a=0 em vez de a=1, porque o "²" era
// simplesmente ignorado pelo regex, não rejeitado). Convertido antes de
// qualquer outra coisa pra "²"/"³"/etc. virarem "^2"/"^3" de verdade,
// consistente em TODAS as ferramentas (calculadora, equação, derivada),
// já que as três usam esta mesma função de normalização.
const SOBRESCRITOS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

export function normalizarExpressao(entrada: string): string {
  return entrada
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '')
    .replace(/π/g, 'pi')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (grupo) =>
      '^' + grupo.split('').map((c) => SOBRESCRITOS[c]).join(''),
    );
}

const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };
const FUNCOES: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
};

type Token = { t: 'num'; v: number } | { t: 'name'; v: string } | { t: '+' | '-' | '*' | '/' | '^' | '(' | ')' };

function tokenizar(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      if ((num.match(/\./g) ?? []).length > 1) throw new Error('Número inválido');
      tokens.push({ t: 'num', v: parseFloat(num) });
    } else if (/[a-z]/.test(c)) {
      let nome = '';
      while (i < s.length && /[a-z]/.test(s[i])) nome += s[i++];
      tokens.push({ t: 'name', v: nome });
    } else if ('+-*/^()'.includes(c)) {
      tokens.push({ t: c } as Token);
      i++;
    } else {
      throw new Error(`Carácter não suportado: "${c}"`);
    }
  }
  return tokens;
}

/** Parser de descida recursiva: expressão → termo → unário → potência → átomo. */
function avaliarTokens(tokens: Token[]): number {
  let pos = 0;
  const proximo = () => tokens[pos];
  const consumir = (t?: Token['t']) => {
    const atual = tokens[pos];
    if (!atual || (t && atual.t !== t)) throw new Error('Expressão incompleta');
    pos++;
    return atual;
  };

  function expressao(): number {
    let v = termo();
    while (proximo() && (proximo().t === '+' || proximo().t === '-')) {
      const op = consumir().t;
      const r = termo();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function termo(): number {
    let v = unario();
    while (proximo() && (proximo().t === '*' || proximo().t === '/')) {
      const op = consumir().t;
      const r = unario();
      if (op === '/' && r === 0) throw new Error('Divisão por zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function unario(): number {
    if (proximo()?.t === '-') {
      consumir();
      return -potencia();
    }
    if (proximo()?.t === '+') {
      consumir();
      return potencia();
    }
    return potencia();
  }
  function potencia(): number {
    const base = atomo();
    if (proximo()?.t === '^') {
      consumir();
      const expo = unario(); // direita-associativo: 2^3^2 = 2^(3^2)
      return Math.pow(base, expo);
    }
    return base;
  }
  function atomo(): number {
    const tk = consumir();
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'name') {
      if (tk.v in CONSTANTES) return CONSTANTES[tk.v];
      if (tk.v in FUNCOES) {
        consumir('(');
        const arg = expressao();
        consumir(')');
        const r = FUNCOES[tk.v](arg);
        if (!Number.isFinite(r)) throw new Error('Resultado fora do domínio');
        return r;
      }
      throw new Error(`Nome desconhecido: "${tk.v}"`);
    }
    if (tk.t === '(') {
      const v = expressao();
      consumir(')');
      return v;
    }
    throw new Error('Expressão inválida');
  }

  const valor = expressao();
  if (pos < tokens.length) throw new Error('Expressão inválida (sobra texto)');
  return valor;
}

function arredondar(v: number, casas = 6): number {
  const r = Math.round(v * 10 ** casas) / 10 ** casas;
  return Object.is(r, -0) ? 0 : r;
}

export function avaliarExpressao(entrada: string): { expressao: string; resultado: number } {
  const norm = normalizarExpressao(entrada);
  if (!norm || norm.length > 200) throw new Error('Expressão vazia ou demasiado longa');
  const valor = avaliarTokens(tokenizar(norm));
  if (!Number.isFinite(valor)) throw new Error('Resultado indefinido');
  return { expressao: norm, resultado: arredondar(valor) };
}

// ---------------------------------------------------------------------------
// Equação do 2.º grau: ax² + bx + c = 0
// ---------------------------------------------------------------------------
export type ResultadoQuadratica = {
  tipo: 'linear' | 'duas-reais' | 'raiz-dupla' | 'complexo';
  passos: string[];
  solucoes: string[];
  exibicao: string;
};

export function resolverQuadratica(a: number, b: number, c: number): ResultadoQuadratica {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
    throw new Error('Coeficientes inválidos');
  }
  if (a === 0) {
    if (b === 0) throw new Error('Com a = 0 e b = 0 não é uma equação do 1.º/2.º grau');
    const x = arredondar(-c / b);
    return {
      tipo: 'linear',
      passos: [
        `Com a = 0 a equação é do 1.º grau: ${b}x + (${c}) = 0`,
        `Isola x: x = −(${c}) / ${b}`,
      ],
      solucoes: [String(x)],
      exibicao: `x = ${x}`,
    };
  }
  const delta = b * b - 4 * a * c;
  const passos = [
    `Identifica os coeficientes: a = ${a}, b = ${b}, c = ${c}`,
    `Calcula o discriminante: Δ = b² − 4ac = (${b})² − 4·(${a})·(${c}) = ${arredondar(delta)}`,
  ];
  if (delta > 0) {
    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);
    passos.push(
      'Δ > 0 → duas soluções reais distintas',
      `x = (−b ± √Δ) / 2a = (${-b} ± √${arredondar(delta)}) / ${2 * a}`,
      `x₁ = ${arredondar(x1)}   e   x₂ = ${arredondar(x2)}`,
    );
    return {
      tipo: 'duas-reais',
      passos,
      solucoes: [String(arredondar(x1)), String(arredondar(x2))],
      exibicao: `x₁ = ${arredondar(x1)}, x₂ = ${arredondar(x2)}`,
    };
  }
  if (delta === 0) {
    const x = -b / (2 * a);
    passos.push('Δ = 0 → uma solução real dupla', `x = −b / 2a = ${arredondar(x)}`);
    return {
      tipo: 'raiz-dupla',
      passos,
      solucoes: [String(arredondar(x))],
      exibicao: `x = ${arredondar(x)} (raiz dupla)`,
    };
  }
  const re = arredondar(-b / (2 * a), 4);
  const im = arredondar(Math.sqrt(-delta) / (2 * a), 4);
  passos.push('Δ < 0 → não há soluções reais; no conjunto dos complexos:', `x = ${re} ± ${Math.abs(im)}i`);
  return {
    tipo: 'complexo',
    passos,
    solucoes: [`${re} + ${Math.abs(im)}i`, `${re} − ${Math.abs(im)}i`],
    exibicao: `x = ${re} ± ${Math.abs(im)}i (complexos)`,
  };
}

/** Tenta extrair a, b, c de texto como "2x^2 - 5x + 3 = 0". */
export function interpretarQuadratica(texto: string): { a: number; b: number; c: number } {
  const s = normalizarExpressao(texto).replace(/\s/g, '').split('=')[0].replace(/-$/, '');
  let a = 0;
  let b = 0;
  let c = 0;
  const re = /([+-]?\d*\.?\d*)x\^2|([+-]?\d*\.?\d*)x(?!\^)|([+-]?\d+\.?\d*)(?!x)/g;
  let m: RegExpExecArray | null;
  let combinou = false;
  const coeficiente = (raw: string) => {
    if (raw === '' || raw === '+') return 1;
    if (raw === '-') return -1;
    return parseFloat(raw);
  };
  while ((m = re.exec(s))) {
    combinou = true;
    if (m[1] !== undefined) a += coeficiente(m[1]);
    else if (m[2] !== undefined) b += coeficiente(m[2]);
    else if (m[3] !== undefined) c += parseFloat(m[3]);
  }
  if (!combinou) {
    throw new Error('Não consegui ler a equação. Usa o formato ax² + bx + c (ex.: 2x^2 - 5x + 3).');
  }
  return { a: arredondar(a), b: arredondar(b), c: arredondar(c) };
}

// ---------------------------------------------------------------------------
// Derivada de polinómios em x (regra da potência, termo a termo)
// ---------------------------------------------------------------------------
function formatarTermo(coef: number, expo: number, primeiro = false): string {
  const sinal = coef < 0 ? '−' : primeiro ? '' : '+ ';
  const abs = Math.abs(coef);
  const coefStr = abs === 1 && expo > 0 ? '' : String(arredondar(abs));
  if (expo === 0) return `${sinal}${coefStr || arredondar(abs)}`;
  if (expo === 1) return `${sinal}${coefStr}x`;
  return `${sinal}${coefStr}x^${expo}`;
}

export function derivarPolinomio(texto: string): { derivada: string; passos: string[] } {
  const s = normalizarExpressao(texto).replace(/\s+/g, '');
  if (!/^[0-9x^+\-.]+$/.test(s)) throw new Error('Apenas polinómios em x (ex.: 3x^4 - 2x^2 + 5x - 7).');
  const termos = s.replace(/(?<=[^e])-/g, '+-').split('+').filter(Boolean);
  const saida: { c: number; e: number }[] = [];
  const passos: string[] = [];
  for (const bruto of termos) {
    const t = bruto;
    if (t.includes('x')) {
      const cm = t.match(/^([+-]?\d*\.?\d*)/)?.[1] ?? '';
      const coef = cm === '' || cm === '+' ? 1 : cm === '-' ? -1 : parseFloat(cm);
      const em = t.match(/\^(-?\d+)/);
      const expo = em ? parseInt(em[1], 10) : 1;
      if (expo === 0) continue;
      const novoCoef = coef * expo;
      const novoExpo = expo - 1;
      saida.push({ c: novoCoef, e: novoExpo });
      passos.push(
        `d/dx [${t}] = ${coef === 1 ? '' : coef}·${expo}x^${novoExpo}${novoExpo === 0 ? ` = ${novoCoef}` : ''} → ${formatarTermo(novoCoef, novoExpo)}`,
      );
    } else {
      passos.push(`d/dx [${t}] = 0 (derivada de uma constante)`);
    }
  }
  if (saida.length === 0) return { derivada: '0', passos: [...passos, 'Resultado: f′(x) = 0'] };
  const expr = saida.map((o, i) => (i === 0 ? formatarTermo(o.c, o.e, true) : formatarTermo(o.c, o.e))).join(' ');
  const derivada = expr.replace(/\s+/g, ' ').trim();
  return { derivada, passos: [...passos, `f′(x) = ${derivada}`] };
}
