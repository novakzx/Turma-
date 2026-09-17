import {
  calcularEstatisticaSemanal,
  calcularSequenciaEstudos,
  formatarTempo,
  separarGabarito,
} from '../regras';
import { MARCADOR_GABARITO } from '../types';

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

describe('separarGabarito', () => {
  it('separa enunciado e gabarito quando o marcador está presente', () => {
    const texto = `1. Quanto é 2+2?\n2. Capital de Portugal?\n${MARCADOR_GABARITO}\n1. 4\n2. Lisboa`;
    const resultado = separarGabarito(texto);
    expect(resultado.enunciado).toBe('1. Quanto é 2+2?\n2. Capital de Portugal?');
    expect(resultado.gabarito).toBe('1. 4\n2. Lisboa');
  });

  it('devolve gabarito null quando o marcador não aparece', () => {
    const resultado = separarGabarito('Resposta sem marcador nenhum.');
    expect(resultado.enunciado).toBe('Resposta sem marcador nenhum.');
    expect(resultado.gabarito).toBeNull();
  });
});

describe('calcularSequenciaEstudos (foguinho)', () => {
  const AGORA = new Date(2026, 8, 17, 15, 0, 0); // 17/set/2026, meio da tarde

  /** Meio-dia local de `diasAtras` dias antes de `AGORA` -- meio-dia
   * evita cair perto da virada de dia por causa de fuso/DST. */
  function diasAtras(n: number): string {
    return new Date(2026, 8, 17 - n, 12, 0, 0).toISOString();
  }

  it('devolve 0 sem nenhuma atividade', () => {
    expect(calcularSequenciaEstudos([], AGORA)).toBe(0);
  });

  it('conta os dias seguidos até hoje', () => {
    const datas = [diasAtras(0), diasAtras(1), diasAtras(2)];
    expect(calcularSequenciaEstudos(datas, AGORA)).toBe(3);
  });

  it('várias mensagens no mesmo dia contam como um dia só', () => {
    const datas = [diasAtras(0), diasAtras(0), diasAtras(0), diasAtras(1)];
    expect(calcularSequenciaEstudos(datas, AGORA)).toBe(2);
  });

  it('continua "viva" se hoje ainda não teve atividade mas ontem teve', () => {
    const datas = [diasAtras(1), diasAtras(2)];
    expect(calcularSequenciaEstudos(datas, AGORA)).toBe(2);
  });

  it('zera quando nem hoje nem ontem tiveram atividade', () => {
    const datas = [diasAtras(2), diasAtras(3)];
    expect(calcularSequenciaEstudos(datas, AGORA)).toBe(0);
  });

  it('para na primeira quebra (buraco no meio corta a sequência)', () => {
    const datas = [diasAtras(0), diasAtras(1), diasAtras(3)]; // falta o dia 2
    expect(calcularSequenciaEstudos(datas, AGORA)).toBe(2);
  });
});

describe('formatarTempo', () => {
  it('formata minutos e segundos com zero à esquerda', () => {
    expect(formatarTempo(125)).toBe('02:05');
    expect(formatarTempo(5)).toBe('00:05');
    expect(formatarTempo(600)).toBe('10:00');
  });

  it('nunca fica negativo', () => {
    expect(formatarTempo(-10)).toBe('00:00');
  });
});
