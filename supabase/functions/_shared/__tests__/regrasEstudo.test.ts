import { escolherModelo, montarPromptSistema } from '../regrasEstudo';

describe('escolherModelo (Gemini — só gemini-flash-latest confirmado, ver comentário na fonte)', () => {
  it('usa gemini-flash-latest pra explicar conceito', () => {
    expect(escolherModelo('explicar')).toBe('gemini-flash-latest');
  });

  it('usa gemini-flash-latest pra tirar dúvida pontual', () => {
    expect(escolherModelo('duvida')).toBe('gemini-flash-latest');
  });

  it('usa gemini-flash-latest pra gerar resumo', () => {
    expect(escolherModelo('resumo')).toBe('gemini-flash-latest');
  });

  it('usa gemini-flash-latest pra montar plano de estudo', () => {
    expect(escolherModelo('plano')).toBe('gemini-flash-latest');
  });
});

describe('montarPromptSistema', () => {
  it('inclui o nome da matéria e o tom de tutor', () => {
    const prompt = montarPromptSistema({ nomeMateria: 'Matemática A', modo: 'explicar' });
    expect(prompt).toContain('Matemática A');
    expect(prompt).toContain('tutor');
  });

  it('mantém a regra de nunca dar resposta pronta sem mostrar raciocínio', () => {
    for (const modo of ['explicar', 'duvida', 'resumo', 'plano'] as const) {
      const prompt = montarPromptSistema({ nomeMateria: 'Física', modo });
      expect(prompt).toContain('raciocínio');
    }
  });

  it('ajusta a instrução pro modo resumo', () => {
    expect(montarPromptSistema({ nomeMateria: 'História', modo: 'resumo' })).toContain('resumo');
  });

  it('ajusta a instrução pro modo plano (pede data da prova)', () => {
    expect(montarPromptSistema({ nomeMateria: 'Química', modo: 'plano' })).toContain(
      'data da prova',
    );
  });
});
