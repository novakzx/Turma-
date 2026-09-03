import { idadeBateComSerie, idadeEsperadaParaSerie } from '../idadeEscolar';

describe('idadeEsperadaParaSerie', () => {
  it('calcula a idade esperada pro 1º ano', () => {
    expect(idadeEsperadaParaSerie('1º ano')).toBe(6);
  });

  it('calcula a idade esperada pro 10º ano', () => {
    expect(idadeEsperadaParaSerie('10º ano')).toBe(15);
  });

  it('calcula a idade esperada pro 12º ano', () => {
    expect(idadeEsperadaParaSerie('12º ano')).toBe(17);
  });

  it('devolve null pra uma série fora da faixa 1-12', () => {
    expect(idadeEsperadaParaSerie('13º ano')).toBeNull();
  });

  it('devolve null quando não tem número nenhum na string', () => {
    expect(idadeEsperadaParaSerie('Turma Única')).toBeNull();
  });
});

describe('idadeBateComSerie', () => {
  it('bate exato', () => {
    expect(idadeBateComSerie(15, '10º ano')).toBe(true);
  });

  it('bate dentro da tolerância de 1 ano', () => {
    expect(idadeBateComSerie(16, '10º ano')).toBe(true);
    expect(idadeBateComSerie(14, '10º ano')).toBe(true);
  });

  it('não bate fora da tolerância', () => {
    expect(idadeBateComSerie(12, '10º ano')).toBe(false);
    expect(idadeBateComSerie(18, '10º ano')).toBe(false);
  });

  it('não bloqueia quando a série não dá pra avaliar (ex.: sem número)', () => {
    expect(idadeBateComSerie(30, 'Turma Única')).toBe(true);
  });
});
