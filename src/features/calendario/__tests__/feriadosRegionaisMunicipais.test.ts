import { feriadosMunicipais, feriadosRegionais } from '../feriadosRegionaisMunicipais';

describe('feriadosRegionais', () => {
  it('gera o feriado dos Açores 50 dias depois da Páscoa (Pentecostes)', () => {
    // Páscoa de 2027 é 28 de março (mesma data já verificada em feriados.ts)
    const eventos = feriadosRegionais(2027);
    const acores = eventos.find((e) => e.id === 'regional-acores-2027');
    expect(acores?.data).toBe('2027-05-17');
  });

  it('feriado da Madeira é sempre 1 de julho', () => {
    const eventos = feriadosRegionais(2026);
    const madeira = eventos.find((e) => e.id === 'regional-madeira-2026');
    expect(madeira?.data).toBe('2026-07-01');
  });

  it('todos os eventos vêm com tipo "regional"', () => {
    expect(feriadosRegionais(2026).every((e) => e.tipo === 'regional')).toBe(true);
  });
});

describe('feriadosMunicipais', () => {
  it('inclui o feriado municipal do Porto (São João) em 24 de junho', () => {
    const eventos = feriadosMunicipais(2026);
    const porto = eventos.find((e) => e.titulo.includes('Porto'));
    expect(porto?.data).toBe('2026-06-24');
  });

  it('calcula corretamente o feriado móvel da Ascensão (Beja/Mafra)', () => {
    // Páscoa de 2027 é 28 de março → Ascensão é 39 dias depois → 6 de maio
    const eventos = feriadosMunicipais(2027);
    const beja = eventos.find((e) => e.titulo.includes('Beja'));
    expect(beja?.data).toBe('2027-05-06');
  });

  it('todos os eventos vêm com tipo "municipal" e id único', () => {
    const eventos = feriadosMunicipais(2026);
    expect(eventos.every((e) => e.tipo === 'municipal')).toBe(true);
    expect(new Set(eventos.map((e) => e.id)).size).toBe(eventos.length);
  });
});
