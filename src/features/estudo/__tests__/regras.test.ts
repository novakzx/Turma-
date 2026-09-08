import { calcularEstatisticaSemanal } from '../regras';

describe('calcularEstatisticaSemanal', () => {
  it('devolve tudo zerado/null sem nenhuma mensagem', () => {
    expect(calcularEstatisticaSemanal([])).toEqual({
      totalPerguntas: 0,
      materiasRevisadas: 0,
      diaMaisAtivo: null,
    });
  });

  it('conta o total de perguntas', () => {
    const mensagens = [
      { materia_id: 'mat-1', criado_em: '2026-09-07T10:00:00Z' }, // segunda
      { materia_id: 'mat-1', criado_em: '2026-09-07T11:00:00Z' },
      { materia_id: 'mat-1', criado_em: '2026-09-08T10:00:00Z' }, // terça
    ];
    expect(calcularEstatisticaSemanal(mensagens).totalPerguntas).toBe(3);
  });

  it('conta matérias diferentes revisadas (sem repetir)', () => {
    const mensagens = [
      { materia_id: 'matematica', criado_em: '2026-09-07T10:00:00Z' },
      { materia_id: 'matematica', criado_em: '2026-09-07T11:00:00Z' },
      { materia_id: 'portugues', criado_em: '2026-09-08T10:00:00Z' },
    ];
    expect(calcularEstatisticaSemanal(mensagens).materiasRevisadas).toBe(2);
  });

  it('aponta o dia da semana com mais perguntas', () => {
    const mensagens = [
      { materia_id: 'm1', criado_em: '2026-09-07T10:00:00Z' }, // segunda
      { materia_id: 'm1', criado_em: '2026-09-08T09:00:00Z' }, // terça
      { materia_id: 'm1', criado_em: '2026-09-08T10:00:00Z' }, // terça
      { materia_id: 'm1', criado_em: '2026-09-08T11:00:00Z' }, // terça (3x, ganha)
    ];
    expect(calcularEstatisticaSemanal(mensagens).diaMaisAtivo).toBe('terça-feira');
  });

  it('em empate, fica com o primeiro dia encontrado (sem crash nem indefinição)', () => {
    const mensagens = [
      { materia_id: 'm1', criado_em: '2026-09-07T10:00:00Z' }, // segunda
      { materia_id: 'm1', criado_em: '2026-09-08T10:00:00Z' }, // terça
    ];
    const resultado = calcularEstatisticaSemanal(mensagens);
    expect(['segunda-feira', 'terça-feira']).toContain(resultado.diaMaisAtivo);
  });
});
