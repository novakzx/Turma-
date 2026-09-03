import { escolherModelo, montarPromptSistema } from '../regrasEstudo';

describe('escolherModelo (brief 6.2: haiku por padrão, sonnet pro elaborado)', () => {
  it('usa haiku pra explicar conceito', () => {
    expect(escolherModelo('explicar')).toBe('claude-haiku-4-5-20251001');
  });

  it('usa haiku pra tirar dúvida pontual', () => {
    expect(escolherModelo('duvida')).toBe('claude-haiku-4-5-20251001');
  });

  it('usa sonnet pra gerar resumo (mais elaborado)', () => {
    expect(escolherModelo('resumo')).toBe('claude-sonnet-5');
  });

  it('usa sonnet pra montar plano de estudo (mais elaborado)', () => {
    expect(escolherModelo('plano')).toBe('claude-sonnet-5');
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
