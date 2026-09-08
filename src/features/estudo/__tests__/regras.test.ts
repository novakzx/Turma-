import {
  analisarApresentacao,
  calcularEstatisticaSemanal,
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

describe('analisarApresentacao', () => {
  it('separa em slides pelo título e pontos', () => {
    const texto =
      '### Slide 1: Introdução\n' +
      '- Ponto um\n' +
      '- Ponto dois\n' +
      '### Slide 2: Desenvolvimento\n' +
      '- Outro ponto\n';
    expect(analisarApresentacao(texto)).toEqual([
      { titulo: 'Introdução', pontos: ['Ponto um', 'Ponto dois'], imagemCaminho: null },
      { titulo: 'Desenvolvimento', pontos: ['Outro ponto'], imagemCaminho: null },
    ]);
  });

  it('devolve null quando o texto não tem nenhum slide no formato certo', () => {
    expect(analisarApresentacao('Resposta comum, sem formato de slide nenhum.')).toBeNull();
  });

  it('ignora linha que não começa com "- " (não vira ponto)', () => {
    const texto = '### Slide 1: Título\nUma frase solta que não é bullet.\n- Ponto de verdade\n';
    expect(analisarApresentacao(texto)).toEqual([
      { titulo: 'Título', pontos: ['Ponto de verdade'], imagemCaminho: null },
    ]);
  });

  it('último slide pega o conteúdo até o fim do texto', () => {
    const texto = '### Slide 1: Só um\n- Ponto A\n- Ponto B';
    expect(analisarApresentacao(texto)).toEqual([
      { titulo: 'Só um', pontos: ['Ponto A', 'Ponto B'], imagemCaminho: null },
    ]);
  });

  it('extrai o caminho da imagem quando presente', () => {
    const texto =
      '### Slide 1: Título\n' +
      '- Ponto um\n' +
      '![slide-imagem](aluno-1/123-0.png)\n' +
      '### Slide 2: Outro\n' +
      '- Ponto dois\n';
    expect(analisarApresentacao(texto)).toEqual([
      { titulo: 'Título', pontos: ['Ponto um'], imagemCaminho: 'aluno-1/123-0.png' },
      { titulo: 'Outro', pontos: ['Ponto dois'], imagemCaminho: null },
    ]);
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
