import { calcularMediaAtual, calcularNotaNecessaria } from '../regras';

describe('calcularNotaNecessaria (brief 6.3)', () => {
  it('calcula a nota necessária com uma única avaliação pendente', () => {
    // Já tem 6 (peso 30) e 7 (peso 30) lançados; falta uma de peso 40.
    // Média desejada 7: (7*100 - (6*30+7*30)) / 40 = (700-390)/40 = 7.75
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 7,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 30, nota: 6 },
        { peso: 30, nota: 7 },
        { peso: 40, nota: null },
      ],
    });
    expect(resultado).toEqual({ status: 'ok', notaNecessaria: 7.75 });
  });

  it('soma o peso de mais de uma avaliação pendente ao mesmo tempo', () => {
    // Uma nota lançada (8, peso 20); duas pendentes (peso 40 cada).
    // Média desejada 6: (6*100 - 8*20) / 80 = (600-160)/80 = 5.5
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 6,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 20, nota: 8 },
        { peso: 40, nota: null },
        { peso: 40, nota: null },
      ],
    });
    expect(resultado).toEqual({ status: 'ok', notaNecessaria: 5.5 });
  });

  it('respeita escala configurável em vez de 0-10 fixo (Portugal usa 0-20)', () => {
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 14,
      notaMaxima: 20,
      avaliacoes: [
        { peso: 50, nota: 12 },
        { peso: 50, nota: null },
      ],
    });
    // (14*100 - 12*50) / 50 = (1400-600)/50 = 16
    expect(resultado).toEqual({ status: 'ok', notaNecessaria: 16 });
  });

  it('devolve "impossivel" em vez de um número maior que a escala', () => {
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 9.5,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 50, nota: 2 },
        { peso: 50, nota: null },
      ],
    });
    // (9.5*100 - 2*50)/50 = (950-100)/50 = 17 > 10
    expect(resultado).toEqual({ status: 'impossivel' });
  });

  it('devolve "ja_atingida" quando nem precisa de nota nas que faltam', () => {
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 5,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 50, nota: 9 },
        { peso: 50, nota: null },
      ],
    });
    // (5*100 - 9*50)/50 = (500-450)/50 = 1, mas já bateria com 0 também
    // nesse caso o resultado dá 1 (positivo) — testar o caso realmente
    // "já bateu" com uma nota alta o suficiente:
    const jaBatida = calcularNotaNecessaria({
      mediaDesejada: 5,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 50, nota: 10 },
        { peso: 50, nota: null },
      ],
    });
    expect(resultado).toEqual({ status: 'ok', notaNecessaria: 1 });
    expect(jaBatida).toEqual({ status: 'ja_atingida' });
  });

  it('devolve "sem_pendentes" quando todas as avaliações já têm nota', () => {
    const resultado = calcularNotaNecessaria({
      mediaDesejada: 7,
      notaMaxima: 10,
      avaliacoes: [
        { peso: 50, nota: 8 },
        { peso: 50, nota: 6 },
      ],
    });
    expect(resultado).toEqual({ status: 'sem_pendentes' });
  });
});

describe('calcularMediaAtual', () => {
  it('calcula a média ponderada só das avaliações já lançadas', () => {
    expect(
      calcularMediaAtual([
        { peso: 30, nota: 6 },
        { peso: 70, nota: 8 },
      ]),
    ).toBeCloseTo(7.4);
  });

  it('ignora avaliações pendentes no cálculo', () => {
    expect(
      calcularMediaAtual([
        { peso: 50, nota: 10 },
        { peso: 50, nota: null },
      ]),
    ).toBe(10);
  });

  it('devolve null quando nenhuma nota foi lançada ainda', () => {
    expect(calcularMediaAtual([{ peso: 100, nota: null }])).toBeNull();
  });
});
