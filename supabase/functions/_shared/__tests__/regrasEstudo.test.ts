import { MARCADOR_GABARITO, escolherModelo, montarPromptSistema } from '../regrasEstudo';

describe('escolherModelo (Cloudflare Workers AI — ids confirmados em developers.cloudflare.com/workers-ai/models)', () => {
  it('usa o modelo leve pra explicar conceito', () => {
    expect(escolherModelo('explicar')).toBe('@cf/meta/llama-3.1-8b-instruct-fast');
  });

  it('usa o modelo leve pra tirar dúvida pontual', () => {
    expect(escolherModelo('duvida')).toBe('@cf/meta/llama-3.1-8b-instruct-fast');
  });

  it('usa o modelo mais forte pra gerar resumo', () => {
    expect(escolherModelo('resumo')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it('usa o modelo mais forte pra montar plano de estudo', () => {
    expect(escolherModelo('plano')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it('usa o modelo mais forte pra prova simulada', () => {
    expect(escolherModelo('prova')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it('usa o modelo mais forte pra apresentação', () => {
    expect(escolherModelo('apresentacao')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });
});

describe('montarPromptSistema', () => {
  it('inclui o nome da matéria e o tom de tutor', () => {
    const prompt = montarPromptSistema({ nomeMateria: 'Matemática A', modo: 'explicar' });
    expect(prompt).toContain('Matemática A');
    expect(prompt).toContain('tutor');
  });

  it('mantém a regra de nunca dar resposta pronta sem mostrar raciocínio', () => {
    for (const modo of [
      'explicar',
      'duvida',
      'resumo',
      'plano',
      'prova',
      'apresentacao',
    ] as const) {
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

  it('ajusta a instrução pro modo prova (pede o marcador de gabarito)', () => {
    const prompt = montarPromptSistema({ nomeMateria: 'Geografia', modo: 'prova' });
    expect(prompt).toContain(MARCADOR_GABARITO);
    expect(prompt).toContain('gabarito');
  });

  it('ajusta a instrução pro modo apresentação (pede o formato de slide)', () => {
    const prompt = montarPromptSistema({ nomeMateria: 'Biologia', modo: 'apresentacao' });
    expect(prompt).toContain('### Slide N:');
    expect(prompt).toContain('- ');
  });
});
