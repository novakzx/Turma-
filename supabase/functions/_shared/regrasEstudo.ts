// Lógica pura por trás da Edge Function chat-estudo (Fase 3, brief 6.2).
// Mesma ideia de regras.ts: sem import de Deno/Supabase, testável com Jest.

export type ModoChatEstudo = 'explicar' | 'duvida' | 'resumo' | 'plano' | 'prova';

export const ROTULO_MODO: Record<ModoChatEstudo, string> = {
  explicar: 'Explicar conceito',
  duvida: 'Tirar dúvida',
  resumo: 'Gerar resumo',
  plano: 'Plano de estudo',
  prova: 'Prova simulada',
};

/** Mesmo marcador que `src/features/estudo/types.ts` — duplicado de
 * propósito, mesma razão de `ModoChatEstudo` estar duplicado nos dois
 * lados (Deno fica fora do tsconfig do app). */
export const MARCADOR_GABARITO = '===GABARITO===';

/**
 * Trocado de Groq pra Cloudflare Workers AI a pedido do usuário — o login
 * do console da Groq estava com bug conhecido (relatado por outros
 * usuários no fórum deles desde fev/2026) impedindo criar a chave; o
 * projeto já tem conta Cloudflare (usada pro rate limiting por IP, ver
 * `private.aplica_rate_limit`), então zero cadastro novo. Tier grátis:
 * 10.000 "neurons"/dia, recorrente (não é crédito único).
 *
 * ACHADO testando ao vivo: `@cf/meta/llama-3.1-8b-instruct` (sem
 * "-fast") já tinha sido descontinuado em 30/mai/2026 — a API responde
 * 410, não 404, então não cai no mesmo "silenciosamente quebra" que o
 * comentário antigo da Gemini temia, mas quebra do mesmo jeito.
 * `@cf/meta/llama-3.1-8b-instruct-fast` é a variante que a própria
 * Cloudflare confirma manter viva (anúncio de depreciação de mai/2026:
 * "-fast" e "-lora" continuam) — só ela deve ser usada, nunca a base sem
 * sufixo. `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (mais forte, já
 * otimizado pra latência) segue confirmado ativo pros modos que pedem
 * mais raciocínio — mesma ideia de escalar modelo por complexidade do
 * brief 6.2 original. Terceira troca de provedor deste projeto (Claude →
 * Gemini → Groq → Cloudflare) — todas por motivo de disponibilidade/
 * acesso, não de qualidade do modelo em si.
 */
export function escolherModelo(modo: ModoChatEstudo): string {
  switch (modo) {
    case 'resumo':
    case 'plano':
    case 'prova':
      return '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    case 'explicar':
    case 'duvida':
    default:
      return '@cf/meta/llama-3.1-8b-instruct-fast';
  }
}

/**
 * Prompt de sistema do tutor (brief 6.2): "tom de tutor, não dá a
 * resposta pronta de exercício sem mostrar o raciocínio". O texto é
 * decisão de produto delegada a quem implementa ("ajuste o texto do
 * prompt de sistema, mas mantenha essa regra") — mantém a regra, mas o
 * texto exato pode evoluir sem quebrar nada que dependa dele.
 */
export function montarPromptSistema(params: { nomeMateria: string; modo: ModoChatEstudo }): string {
  const base =
    `Você é um tutor de ${params.nomeMateria} pra um aluno do ensino básico/secundário em Portugal. ` +
    'Explique com clareza, em português de Portugal, no nível da idade escolar. ' +
    'Nunca dê a resposta pronta de um exercício sem mostrar o raciocínio passo a passo — ' +
    'o objetivo é o aluno aprender a chegar lá, não só copiar a resposta.';

  switch (params.modo) {
    case 'prova':
      return (
        base +
        ' Agora monte uma prova simulada curta (5 perguntas, nível da matéria e da idade escolar) ' +
        `sobre o assunto que o aluno pedir. Numere as perguntas. Depois da última pergunta, escreva ` +
        `a linha exata "${MARCADOR_GABARITO}" sozinha, e só depois dela o gabarito numerado com a ` +
        'resposta certa de cada uma (aqui, diferente do resto do tutor, pode dar a resposta pronta — ' +
        'é o gabarito, o aluno pediu pra conferir depois de tentar sozinho).'
      );
    case 'resumo':
      return (
        base +
        ' Agora o aluno vai colar um texto e pedir um resumo — foque nos pontos principais, ' +
        'em tópicos claros, sem inventar informação que não está no texto original.'
      );
    case 'plano':
      return (
        base +
        ' Agora o aluno quer um plano de estudo pra uma prova. Pergunte a data da prova e os ' +
        'temas se não tiverem sido informados, e monte um plano dia a dia, realista, com o ' +
        'tempo que resta até lá.'
      );
    case 'duvida':
      return base + ' O aluno tem uma dúvida pontual — responda direto ao ponto, sem enrolar.';
    case 'explicar':
    default:
      return (
        base + ' O aluno quer entender um conceito — comece do básico e construa a explicação.'
      );
  }
}
