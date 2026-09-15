import {
  MARCADOR_GABARITO,
  MODELO_VISAO,
  escolherModelo,
  montarPromptSistema,
  montarPromptVisao,
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
});

describe('montarPromptSistema', () => {
  it('inclui o nome da matéria e o tom de tutor', () => {
    const prompt = montarPromptSistema({ nomeMateria: 'Matemática A', modo: 'explicar' });
    expect(prompt).toContain('Matemática A');
    expect(prompt).toContain('tutor');
  });

  it('mantém a regra de nunca dar resposta pronta sem mostrar raciocínio', () => {
    for (const modo of ['explicar', 'duvida', 'resumo', 'plano', 'prova'] as const) {
      const prompt = montarPromptSistema({ nomeMateria: 'Física', modo });
      expect(prompt).toContain('raciocínio');
    }
  });

  // ACHADO testando ao vivo: usuário relatou "a IA responde cheio de *
  // e tenta digitar os icones" — gemma4:31b formata em Markdown por
  // padrão, mas a bolha de mensagem do chat é `<Text>` puro (não
  // interpreta Markdown), então o aluno via os `**`/`*` literalmente.
  it('pede texto simples, sem Markdown nem emoji, em todos os modos', () => {
    for (const modo of ['explicar', 'duvida', 'resumo', 'plano', 'prova'] as const) {
      const prompt = montarPromptSistema({ nomeMateria: 'Física', modo });
      expect(prompt).toContain('sem nenhuma formatação Markdown');
      expect(prompt).toContain('emoji');
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
});

describe('montarPromptVisao', () => {
  it('inclui o nome da matéria e a pergunta do aluno', () => {
    const prompt = montarPromptVisao({ nomeMateria: 'Matemática A', pergunta: 'Isso está certo?' });
    expect(prompt).toContain('Matemática A');
    expect(prompt).toContain('Isso está certo?');
  });

  it('pede pra descrever a foto antes de responder', () => {
    const prompt = montarPromptVisao({ nomeMateria: 'Física', pergunta: 'dúvida' });
    expect(prompt).toContain('foto');
    expect(prompt).toContain('escrito');
  });

  it('instrui a IA a admitir quando a letra estiver ilegível, em vez de adivinhar', () => {
    const prompt = montarPromptVisao({ nomeMateria: 'Português', pergunta: 'dúvida' });
    expect(prompt).toContain('ilegível');
  });

  it('mantém a regra de nunca dar resposta pronta sem mostrar raciocínio', () => {
    const prompt = montarPromptVisao({ nomeMateria: 'Química', pergunta: 'dúvida' });
    expect(prompt).toContain('raciocínio');
  });

  it('pede texto simples, sem Markdown nem emoji', () => {
    const prompt = montarPromptVisao({ nomeMateria: 'Química', pergunta: 'dúvida' });
    expect(prompt).toContain('sem nenhuma formatação Markdown');
    expect(prompt).toContain('emoji');
  });
});

describe('MODELO_VISAO', () => {
  // Quarta tentativa: Llama Vision da Meta (licença EU) → LLaVA
  // (Cloudflare, ruim lendo texto) → Moondream (Cloudflare, endpoint
  // nunca respondia) → gemma4:31b (Ollama Cloud, pedido do usuário,
  // testado ao vivo lendo 100% certo). Ver comentário na constante.
  it('é o gemma4:31b via Ollama Cloud (não mais Cloudflare Workers AI)', () => {
    expect(MODELO_VISAO).toBe('gemma4:31b');
  });
});
