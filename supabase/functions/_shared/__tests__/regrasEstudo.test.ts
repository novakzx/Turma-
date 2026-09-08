import {
  MARCADOR_GABARITO,
  escolherModelo,
  extrairTitulosSlides,
  inserirImagensNosSlides,
  montarPromptImagemSlide,
  montarPromptSistema,
} from '../regrasEstudo';

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

describe('extrairTitulosSlides', () => {
  it('extrai os títulos na ordem em que aparecem', () => {
    const texto = '### Slide 1: Um\n- ponto\n### Slide 2: Dois\n- outro ponto\n';
    expect(extrairTitulosSlides(texto)).toEqual(['Um', 'Dois']);
  });

  it('devolve null sem nenhum slide no formato certo', () => {
    expect(extrairTitulosSlides('texto qualquer sem slide')).toBeNull();
  });
});

describe('montarPromptImagemSlide', () => {
  it('inclui a matéria, o título do slide e a instrução de não gerar texto', () => {
    const prompt = montarPromptImagemSlide('Matemática A', 'Frações próprias');
    expect(prompt).toContain('Matemática A');
    expect(prompt).toContain('Frações próprias');
    expect(prompt).toContain('no text');
  });
});

describe('inserirImagensNosSlides', () => {
  it('insere a linha de imagem depois do conteúdo de cada slide', () => {
    const texto = '### Slide 1: Um\n- ponto A\n### Slide 2: Dois\n- ponto B';
    const resultado = inserirImagensNosSlides(texto, ['caminho/0.png', 'caminho/1.png']);
    expect(resultado).toBe(
      '### Slide 1: Um\n- ponto A\n![slide-imagem](caminho/0.png)\n' +
        '### Slide 2: Dois\n- ponto B\n![slide-imagem](caminho/1.png)\n',
    );
  });

  it('pula o slide cuja geração de imagem falhou (null), sem quebrar os outros', () => {
    const texto = '### Slide 1: Um\n- ponto A\n### Slide 2: Dois\n- ponto B';
    const resultado = inserirImagensNosSlides(texto, [null, 'caminho/1.png']);
    expect(resultado).toBe(
      '### Slide 1: Um\n- ponto A\n### Slide 2: Dois\n- ponto B\n![slide-imagem](caminho/1.png)\n',
    );
  });

  it('devolve o texto sem alteração quando não há slide nenhum', () => {
    expect(inserirImagensNosSlides('texto sem slide', ['caminho/0.png'])).toBe('texto sem slide');
  });
});
