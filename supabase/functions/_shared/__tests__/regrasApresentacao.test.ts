import {
  MODELO_IMAGEM_APRESENTACAO,
  MODELO_TEXTO_APRESENTACAO,
  interpretarRespostaApresentacao,
  montarPromptApresentacao,
  montarPromptImagemSlide,
} from '../regrasApresentacao';

describe('montarPromptApresentacao', () => {
  it('inclui o nome da matéria e o tópico', () => {
    const prompt = montarPromptApresentacao({ nomeMateria: 'História A', topico: 'Segunda Guerra' });
    expect(prompt).toContain('História A');
    expect(prompt).toContain('Segunda Guerra');
  });

  it('pede JSON estrito e o prompt de imagem em inglês', () => {
    const prompt = montarPromptApresentacao({ nomeMateria: 'Física', topico: 'dúvida' });
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('promptImagem');
    expect(prompt).toContain('INGLÊS');
  });
});

describe('interpretarRespostaApresentacao', () => {
  const slideValido = { titulo: 'Introdução', topicos: ['Ponto 1', 'Ponto 2'], promptImagem: 'a cat' };

  it('interpreta um array JSON válido', () => {
    const resultado = interpretarRespostaApresentacao(JSON.stringify([slideValido]));
    expect(resultado).toEqual([slideValido]);
  });

  it('tolera cercas de código Markdown (```json ... ```) ao redor do JSON', () => {
    const resultado = interpretarRespostaApresentacao(
      '```json\n' + JSON.stringify([slideValido]) + '\n```',
    );
    expect(resultado).toEqual([slideValido]);
  });

  it('tira espaço em branco de título/tópicos/promptImagem', () => {
    const comEspaco = { titulo: '  Título  ', topicos: ['  A  ', 'B'], promptImagem: '  cat  ' };
    const resultado = interpretarRespostaApresentacao(JSON.stringify([comEspaco]));
    expect(resultado).toEqual([{ titulo: 'Título', topicos: ['A', 'B'], promptImagem: 'cat' }]);
  });

  it('rejeita texto que não é JSON válido', () => {
    expect(() => interpretarRespostaApresentacao('isto não é json')).toThrow(
      'A IA não devolveu um plano de slides válido',
    );
  });

  it('rejeita array vazio', () => {
    expect(() => interpretarRespostaApresentacao('[]')).toThrow(
      'A IA devolveu um número de slides inesperado',
    );
  });

  it('rejeita algo que não é array (ex.: um objeto solto)', () => {
    expect(() => interpretarRespostaApresentacao(JSON.stringify(slideValido))).toThrow(
      'A IA devolveu um número de slides inesperado',
    );
  });

  // ACHADO no episódio das ferramentas de cálculo: nunca aceitar dado
  // malformado em silêncio. Cada campo obrigatório tem seu próprio
  // teste de rejeição.
  it('rejeita slide sem título', () => {
    const semTitulo = { topicos: ['A'], promptImagem: 'cat' };
    expect(() => interpretarRespostaApresentacao(JSON.stringify([semTitulo]))).toThrow(
      'A IA devolveu um slide malformado',
    );
  });

  it('rejeita slide com tópicos vazio', () => {
    const semTopicos = { titulo: 'A', topicos: [], promptImagem: 'cat' };
    expect(() => interpretarRespostaApresentacao(JSON.stringify([semTopicos]))).toThrow(
      'A IA devolveu um slide malformado',
    );
  });

  it('rejeita slide sem promptImagem', () => {
    const semPrompt = { titulo: 'A', topicos: ['A'] };
    expect(() => interpretarRespostaApresentacao(JSON.stringify([semPrompt]))).toThrow(
      'A IA devolveu um slide malformado',
    );
  });

  it('rejeita um item de tópico que não é string', () => {
    const topicoInvalido = { titulo: 'A', topicos: ['A', 42], promptImagem: 'cat' };
    expect(() => interpretarRespostaApresentacao(JSON.stringify([topicoInvalido]))).toThrow(
      'A IA devolveu um slide malformado',
    );
  });
});

describe('montarPromptImagemSlide', () => {
  it('acrescenta o sufixo de estilo consistente e "sem texto"', () => {
    const prompt = montarPromptImagemSlide('a photosynthesis diagram');
    expect(prompt).toContain('a photosynthesis diagram');
    expect(prompt).toContain('no text');
  });
});

describe('modelos', () => {
  it('usa o Flux Schnell (grátis) pra imagem, não um modelo pago', () => {
    expect(MODELO_IMAGEM_APRESENTACAO).toBe('@cf/black-forest-labs/flux-1-schnell');
  });

  it('usa o modelo de texto mais forte, pra seguir o formato JSON com mais confiança', () => {
    expect(MODELO_TEXTO_APRESENTACAO).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });
});
