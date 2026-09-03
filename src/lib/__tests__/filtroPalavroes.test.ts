import { censurarTexto } from '../filtroPalavroes';

describe('censurarTexto', () => {
  it('censura um palavrão isolado com um marcador de tamanho fixo', () => {
    // Marcador de tamanho fixo (não do tamanho da palavra) de propósito
    // — ver comentário em `filtroPalavroes.ts` sobre não vazar o
    // tamanho do trecho ofuscado batido.
    expect(censurarTexto('que porra é essa')).toBe('que **** é essa');
  });

  it('censura independente de maiúsculas/minúsculas', () => {
    expect(censurarTexto('CARALHO, que confusão')).toBe('****, que confusão');
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
    expect(censurarTexto('porra, que merda de dia')).toBe('****, que **** de dia');
  });

  it('devolve null/undefined sem quebrar (mesmo comportamento de post sem legenda)', () => {
    expect(censurarTexto(null)).toBeNull();
    expect(censurarTexto(undefined)).toBeUndefined();
  });

  it('devolve string vazia sem quebrar', () => {
    expect(censurarTexto('')).toBe('');
  });

  it('censura um insulto (não só palavrão de baixo calão)', () => {
    expect(censurarTexto('não sejas idiota')).toBe('não sejas ****');
  });

  describe('resistência a ofuscação (abreviação/leetspeak)', () => {
    it('pega substituição leetspeak dígito por letra', () => {
      expect(censurarTexto('p0rr4 que confusão')).toBe('**** que confusão');
      expect(censurarTexto('c4r4lh0!')).toBe('****!');
    });

    it('pega letras separadas por pontuação ou espaço', () => {
      expect(censurarTexto('p.o.r.r.a')).toBe('****');
      expect(censurarTexto('p o r r a')).toBe('****');
      expect(censurarTexto('m-e-r-d-a')).toBe('****');
    });

    it('pega letra repetida em excesso (alongamento)', () => {
      expect(censurarTexto('poooorraaaa')).toBe('****');
    });

    it('pega símbolo no lugar de vogal (@, !, $)', () => {
      expect(censurarTexto('put@')).toBe('****');
      expect(censurarTexto('merd@')).toBe('****');
    });

    it('não deixa o separador engolir uma frase inteira', () => {
      // Letras de "puta" espalhadas por uma frase legítima, bem
      // distantes uma da outra, não devem casar — o separador entre
      // letras é limitado a poucos caracteres de propósito.
      expect(censurarTexto('Paulo usou tinta amarela ontem')).toBe(
        'Paulo usou tinta amarela ontem',
      );
    });

    it('não censura "bicha" (falso positivo conhecido: também significa "fila" em PT-PT)', () => {
      expect(censurarTexto('tive de fazer bicha na cantina')).toBe(
        'tive de fazer bicha na cantina',
      );
    });
  });
});
