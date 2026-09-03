// Lógica pura por trás da Edge Function chat-estudo (Fase 3, brief 6.2).
// Mesma ideia de regras.ts: sem import de Deno/Supabase, testável com Jest.

export type ModoChatEstudo = 'explicar' | 'duvida' | 'resumo' | 'plano';

export const ROTULO_MODO: Record<ModoChatEstudo, string> = {
  explicar: 'Explicar conceito',
  duvida: 'Tirar dúvida',
  resumo: 'Gerar resumo',
  plano: 'Plano de estudo',
};

/**
 * Trocado de Claude (Anthropic) pra Gemini (Google) a pedido do usuário —
 * mesma ideia de escalar modelo por complexidade que o brief 6.2 original
 * pedia pro Claude, só que `gemini-flash-latest` é o único id de modelo
 * confirmado de verdade (testado pelo usuário com a própria chave, ver
 * `README.md` > "Edge Functions e automações"); a lista de modelos da
 * Gemini muda com frequência e um id "pro" chutado sem confirmar quebraria
 * silenciosamente os modos resumo/plano (a API responde 404 pra modelo
 * inexistente). Por enquanto todos os modos usam o mesmo modelo — trocar
 * resumo/plano pra um tier mais caro é seguro reativar depois que alguém
 * confirmar o id certo (ver https://ai.google.dev/gemini-api/docs/models).
 */
export function escolherModelo(_modo: ModoChatEstudo): string {
  return 'gemini-flash-latest';
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
