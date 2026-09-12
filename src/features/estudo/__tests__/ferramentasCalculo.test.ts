import {
  avaliarExpressao,
  derivarPolinomio,
  interpretarQuadratica,
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
});

describe('derivarPolinomio', () => {
  it('deriva 3x^4 - 2x^2 + 5x - 7 termo a termo', () => {
    const r = derivarPolinomio('3x^4 - 2x^2 + 5x - 7');
    expect(r.derivada.replace(/\s+/g, ' ')).toBe('12x^3 −4x + 5');
  });

  it('derivada de uma constante isolada é 0', () => {
    expect(derivarPolinomio('7').derivada).toBe('0');
  });
});
