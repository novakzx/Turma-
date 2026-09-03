import { diasAte, FERIADOS_E_INTERRUPCOES, listarOrdenados, proximoEvento } from '../feriados';

describe('listarOrdenados', () => {
  it('devolve a lista em ordem cronológica', () => {
    const ordenada = listarOrdenados();
    for (let i = 1; i < ordenada.length; i++) {
      const anterior = ordenada[i - 1].data ?? ordenada[i - 1].inicio ?? '';
      const atual = ordenada[i].data ?? ordenada[i].inicio ?? '';
      expect(anterior <= atual).toBe(true);
    }
  });

  it('não perde nenhum item da lista original', () => {
    expect(listarOrdenados()).toHaveLength(FERIADOS_E_INTERRUPCOES.length);
  });
});

describe('proximoEvento', () => {
  it('encontra o próximo feriado nacional a partir de uma data no meio do ano letivo', () => {
    const evento = proximoEvento(new Date('2026-10-01T12:00:00Z'));
    expect(evento?.id).toBe('implantacao-republica-2026');
  });

  it('encontra a próxima interrupção letiva pela data de início, não de fim', () => {
    const evento = proximoEvento(new Date('2026-12-10T12:00:00Z'));
    expect(evento?.id).toBe('interrupcao-natal');
  });

  it('devolve null depois do último evento da lista', () => {
    const evento = proximoEvento(new Date('2027-07-01T12:00:00Z'));
    expect(evento).toBeNull();
  });
});

describe('diasAte', () => {
  it('conta dias corridos até uma data futura', () => {
    expect(diasAte('2026-10-05', new Date('2026-10-01T23:00:00Z'))).toBe(4);
  });

  it('devolve 0 no próprio dia', () => {
    expect(diasAte('2026-10-05', new Date('2026-10-05T08:00:00Z'))).toBe(0);
  });

  it('devolve negativo pra uma data já passada', () => {
    expect(diasAte('2026-10-05', new Date('2026-10-10T08:00:00Z'))).toBe(-5);
  });
});
