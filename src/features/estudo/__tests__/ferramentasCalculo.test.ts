import {
  avaliarExpressao,
  derivarPolinomio,
  interpretarQuadratica,
  normalizarExpressao,
  resolverQuadratica,
} from '../ferramentasCalculo';

describe('avaliarExpressao', () => {
  it('respeita precedência de operadores', () => {
    expect(avaliarExpressao('2+3*4').resultado).toBe(14);
  });

  it('aceita vírgula decimal e símbolos × ÷ (notação pt-PT)', () => {
    expect(avaliarExpressao('1,5×2').resultado).toBe(3);
    expect(avaliarExpressao('10÷4').resultado).toBe(2.5);
  });

  it('calcula funções e constantes', () => {
    expect(avaliarExpressao('sqrt(16)').resultado).toBe(4);
    expect(avaliarExpressao('2*pi').resultado).toBeCloseTo(6.283185, 5);
  });

  it('rejeita divisão por zero', () => {
    expect(() => avaliarExpressao('5/0')).toThrow('Divisão por zero');
  });

  it('rejeita expressão vazia', () => {
    expect(() => avaliarExpressao('')).toThrow();
  });

  // ACHADO testando ao vivo (usuário relatou ferramentas difíceis de
  // usar): a própria dica de erro da equação mostra "ax² + bx + c",
  // então "²" precisa funcionar em todo lugar, não só na equação.
  it('aceita "²"/"³" de verdade (não só "^2"/"^3")', () => {
    expect(avaliarExpressao('3²').resultado).toBe(9);
    expect(avaliarExpressao('2³').resultado).toBe(8);
  });
});

describe('normalizarExpressao', () => {
  it('converte dígito sobrescrito (²³...) pra "^N"', () => {
    expect(normalizarExpressao('x²')).toBe('x^2');
    expect(normalizarExpressao('x³')).toBe('x^3');
  });
});

describe('resolverQuadratica', () => {
  it('resolve com duas raízes reais (x² - 5x + 6 = 0 → x=2, x=3)', () => {
    const r = resolverQuadratica(1, -5, 6);
    expect(r.tipo).toBe('duas-reais');
    expect(r.solucoes).toEqual(['3', '2']);
  });

  it('resolve raiz dupla (x² - 4x + 4 = 0 → x=2)', () => {
    const r = resolverQuadratica(1, -4, 4);
    expect(r.tipo).toBe('raiz-dupla');
    expect(r.solucoes).toEqual(['2']);
  });

  it('cai pro caso linear quando a = 0', () => {
    const r = resolverQuadratica(0, 2, -4);
    expect(r.tipo).toBe('linear');
    expect(r.solucoes).toEqual(['2']);
  });

  it('devolve solução complexa quando Δ < 0', () => {
    const r = resolverQuadratica(1, 0, 1);
    expect(r.tipo).toBe('complexo');
  });

  it('rejeita a = 0 e b = 0 juntos', () => {
    expect(() => resolverQuadratica(0, 0, 5)).toThrow();
  });
});

describe('interpretarQuadratica', () => {
  it('lê "2x^2 - 5x + 3 = 0"', () => {
    expect(interpretarQuadratica('2x^2 - 5x + 3 = 0')).toEqual({ a: 2, b: -5, c: 3 });
  });

  // BUG real testando ao vivo: antes do fix, "x² - 5x + 6 = 0" (com o
  // "²" de verdade, exatamente como a dica de erro da própria
  // ferramenta sugere escrever) não dava erro nenhum — calculava
  // ERRADO em silêncio (a virava 0 em vez de 1, porque o "²" era
  // ignorado pelo regex sem ser rejeitado). Pior que travar: parecia
  // ter funcionado.
  it('lê "x² - 5x + 6 = 0" com o "²" de verdade, sem calcular errado', () => {
    expect(interpretarQuadratica('x² - 5x + 6 = 0')).toEqual({ a: 1, b: -5, c: 6 });
  });
});

describe('derivarPolinomio', () => {
  it('deriva 3x^4 - 2x^2 + 5x - 7 termo a termo', () => {
    const r = derivarPolinomio('3x^4 - 2x^2 + 5x - 7');
    expect(r.derivada.replace(/\s+/g, ' ')).toBe('12x^3 −4x + 5');
  });

  it('derivada de uma constante isolada é 0', () => {
    expect(derivarPolinomio('7').derivada).toBe('0');
  });

  it('aceita "²" de verdade no polinómio (ex.: 3x⁴ - 2x²)', () => {
    const r = derivarPolinomio('3x⁴ - 2x² + 5x - 7');
    expect(r.derivada.replace(/\s+/g, ' ')).toBe('12x^3 −4x + 5');
  });
});
