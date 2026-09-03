import { censurarTexto } from '../filtroPalavroes';

describe('censurarTexto', () => {
  it('censura um palavrão isolado com asteriscos do mesmo tamanho', () => {
    expect(censurarTexto('que porra é essa')).toBe('que ***** é essa');
  });

  it('censura independente de maiúsculas/minúsculas', () => {
    expect(censurarTexto('CARALHO, que confusão')).toBe('*******, que confusão');
  });

  it('não mexe em texto sem nada de errado', () => {
    expect(censurarTexto('Texto normal sem nada de errado')).toBe(
      'Texto normal sem nada de errado',
    );
  });

  it('não gera falso positivo em palavra que só contém um palavrão como substring', () => {
    // "Curitiba" contém "cu" como prefixo de "cuzão" só em teoria — o
    // filtro usa fronteira de palavra (\b), então cidade nenhuma vira
    // asterisco por acidente.
    expect(censurarTexto('Passar por Curitiba amanhã')).toBe('Passar por Curitiba amanhã');
  });

  it('censura mais de um palavrão na mesma frase', () => {
    expect(censurarTexto('porra, que merda de dia')).toBe('*****, que ***** de dia');
  });

  it('devolve null/undefined sem quebrar (mesmo comportamento de post sem legenda)', () => {
    expect(censurarTexto(null)).toBeNull();
    expect(censurarTexto(undefined)).toBeUndefined();
  });

  it('devolve string vazia sem quebrar', () => {
    expect(censurarTexto('')).toBe('');
  });
});
