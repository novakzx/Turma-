import type { FeriadoOuInterrupcao } from '../feriados';
import { gerarIcs, mesclarEventos } from '../regras';

const FERIADOS: FeriadoOuInterrupcao[] = [
  { id: 'natal', nome: 'Natal', tipo: 'nacional', data: '2026-12-25' },
  {
    id: 'interrupcao-pascoa',
    nome: 'Interrupção da Páscoa',
    tipo: 'letivo',
    inicio: '2027-03-22',
    fim: '2027-04-02',
  },
];

describe('mesclarEventos', () => {
  it('junta feriados e avaliações numa lista ordenada por data', () => {
    const avaliacoes = [
      { id: 'av-1', nome: 'Teste 1', data: '2026-12-10', materiaNome: 'Matemática' },
    ];
    const resultado = mesclarEventos(FERIADOS, avaliacoes);
    expect(resultado.map((e) => e.id)).toEqual(['av-1', 'natal', 'interrupcao-pascoa']);
  });

  it('avaliação sem data marcada não entra na lista', () => {
    const avaliacoes = [{ id: 'av-1', nome: 'Sem data', data: null }];
    const resultado = mesclarEventos(FERIADOS, avaliacoes);
    expect(resultado.some((e) => e.id === 'av-1')).toBe(false);
  });

  it('avaliação usa a data de início do intervalo, e o título junta nome + matéria', () => {
    const avaliacoes = [{ id: 'av-1', nome: 'Prova', data: '2026-12-10', materiaNome: 'Física' }];
    const resultado = mesclarEventos([], avaliacoes);
    expect(resultado[0]).toMatchObject({
      titulo: 'Prova — Física',
      data: '2026-12-10',
      tipo: 'avaliacao',
    });
  });

  it('interrupção letiva (intervalo) usa a data de início', () => {
    const resultado = mesclarEventos(FERIADOS, []);
    const pascoa = resultado.find((e) => e.id === 'interrupcao-pascoa');
    expect(pascoa?.data).toBe('2027-03-22');
  });
});

describe('gerarIcs', () => {
  it('gera um VCALENDAR válido com um VEVENT por evento', () => {
    const ics = gerarIcs([
      { id: 'natal', titulo: 'Natal', data: '2026-12-25', tipo: 'nacional' },
      { id: 'av-1', titulo: 'Prova — Física', data: '2026-12-10', tipo: 'avaliacao' },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261225');
    expect(ics).toContain('SUMMARY:Natal');
    expect(ics).toContain('SUMMARY:Prova — Física');
  });

  it('escapa vírgula no título pra não quebrar o formato ICS', () => {
    const ics = gerarIcs([
      { id: 'x', titulo: 'Prova, capítulos 1 e 2', data: '2026-01-01', tipo: 'avaliacao' },
    ]);
    expect(ics).toContain('SUMMARY:Prova\\, capítulos 1 e 2');
  });

  it('lista vazia ainda gera um VCALENDAR válido (sem VEVENT nenhum)', () => {
    const ics = gerarIcs([]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('VEVENT');
  });
});
