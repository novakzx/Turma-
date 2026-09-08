import { calcularProximaRevisao, filtrarDevidos } from '../regras';

describe('calcularProximaRevisao', () => {
  const base = new Date('2027-01-10T00:00:00Z');

  it('"errei" volta o intervalo pra 1 dia e reduz o fator', () => {
    const r = calcularProximaRevisao({ intervaloDias: 6, fatorFacilidade: 2.5 }, 'errei', base);
    expect(r.intervaloDias).toBe(1);
    expect(r.fatorFacilidade).toBe(2.3);
    expect(r.proximaRevisao).toBe('2027-01-11');
  });

  it('"errei" nunca deixa o fator cair abaixo do mínimo (1.3)', () => {
    const r = calcularProximaRevisao({ intervaloDias: 6, fatorFacilidade: 1.35 }, 'errei', base);
    expect(r.fatorFacilidade).toBe(1.3);
  });

  it('primeiro acerto ("facil") pula direto pro intervalo de 6 dias', () => {
    const r = calcularProximaRevisao({ intervaloDias: 1, fatorFacilidade: 2.5 }, 'facil', base);
    expect(r.intervaloDias).toBe(6);
    expect(r.proximaRevisao).toBe('2027-01-16');
  });

  it('"dificil" cresce o intervalo mas reduz o fator de facilidade', () => {
    const r = calcularProximaRevisao({ intervaloDias: 6, fatorFacilidade: 2.5 }, 'dificil', base);
    expect(r.fatorFacilidade).toBe(2.35);
    expect(r.intervaloDias).toBe(Math.round(6 * 2.35));
  });

  it('"facil" cresce o intervalo e aumenta o fator de facilidade', () => {
    const r = calcularProximaRevisao({ intervaloDias: 6, fatorFacilidade: 2.5 }, 'facil', base);
    expect(r.fatorFacilidade).toBe(2.6);
    expect(r.intervaloDias).toBe(Math.round(6 * 2.6));
  });
});

describe('filtrarDevidos', () => {
  const hoje = new Date('2027-01-10T00:00:00Z');

  it('inclui cartão com revisão hoje ou atrasada, exclui revisão futura', () => {
    const cartoes = [
      { id: 'atrasado', proximaRevisao: '2027-01-05' },
      { id: 'hoje', proximaRevisao: '2027-01-10' },
      { id: 'futuro', proximaRevisao: '2027-01-20' },
    ];
    const devidos = filtrarDevidos(cartoes, hoje);
    expect(devidos.map((c) => c.id)).toEqual(['atrasado', 'hoje']);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(filtrarDevidos([], hoje)).toEqual([]);
  });
});
