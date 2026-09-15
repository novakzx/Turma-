// Lógica pura por trás da Edge Function gerar-apresentacao (pedido do
// usuário — "IA que faz apresentações... que nem no powerpoint
// canva"). Mesma ideia de regrasEstudo.ts: sem import de Deno/Supabase,
// testável com Jest.

/**
 * Modelo de TEXTO — reusa o mais forte já usado pra resumo/plano/prova
 * em `regrasEstudo.ts` (`escolherModelo`), porque aqui a IA precisa
 * seguir um formato JSON estrito, não só escrever prosa — modelo mais
 * fraco erra formato com mais frequência.
 */
export const MODELO_TEXTO_APRESENTACAO = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Modelo de IMAGEM — Flux Schnell da Cloudflare, confirmado grátis
 * (mesmo tier compartilhado dos modelos de texto, sem custo extra) e
 * rápido (documentação da própria Cloudflare: "ultra-fast", 4 passos
 * de difusão por padrão). Endpoint nativo `/ai/run/{modelo}`, corpo
 * `{ prompt, steps? }`, resposta `{ image: "<base64>" }` — schema
 * confirmado direto em `schema-input.json`/`schema-output.json` da
 * documentação, não só suposto (achado do episódio da visão: sempre
 * confirmar o schema de verdade antes de escrever código).
 */
export const MODELO_IMAGEM_APRESENTACAO = '@cf/black-forest-labs/flux-1-schnell';

export const SLIDES_MINIMO = 4;
export const SLIDES_MAXIMO = 7;

/** Pedido em JSON estrito — a IA de texto não recebe o prompt da
 * imagem em português: pede explicitamente em inglês, porque o modelo
 * de imagem (Flux) segue instrução em inglês de forma muito mais
 * confiável (mesmo com o resto do app em português). */
export function montarPromptApresentacao(params: { nomeMateria: string; topico: string }): string {
  return (
    `Cria um plano de apresentação de slides sobre "${params.topico}" pra uma aula de ` +
    `${params.nomeMateria}, nível do ensino básico/secundário em Portugal. Entre ${SLIDES_MINIMO} e ` +
    `${SLIDES_MAXIMO} slides. Responde SÓ com um array JSON válido, sem nenhum texto antes ou depois ` +
    'e sem marcação Markdown (sem ```), exatamente neste formato: ' +
    '[{"titulo": "...", "topicos": ["...", "..."], "promptImagem": "..."}]. ' +
    '"titulo" é o título do slide, em português de Portugal. "topicos" é uma lista de 2 a 4 frases ' +
    'curtas (bullet points), em português de Portugal, sem repetir o título. "promptImagem" é uma ' +
    'descrição EM INGLÊS de uma ilustração simples e educativa pra esse slide, sem nenhum texto ou ' +
    'letra escrita na imagem.'
  );
}

export type SlideGerado = { titulo: string; topicos: string[]; promptImagem: string };

/** Interpreta e valida a resposta da IA de texto — nunca aceita dado
 * malformado em silêncio (achado ao vivo no bug das ferramentas de
 * cálculo: pior que dar erro é "parecer que funcionou" com dado
 * errado). Tolerante só com cercas de código Markdown (```json ... ```)
 * que a IA às vezes acrescenta mesmo sendo instruída a não fazer isso —
 * o resto do formato é validado com rigor. */
export function interpretarRespostaApresentacao(textoResposta: string): SlideGerado[] {
  const limpo = textoResposta
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let dados: unknown;
  try {
    dados = JSON.parse(limpo);
  } catch {
    throw new Error('A IA não devolveu um plano de slides válido — tenta de novo.');
  }

  if (!Array.isArray(dados) || dados.length === 0 || dados.length > 12) {
    throw new Error('A IA devolveu um número de slides inesperado — tenta de novo.');
  }

  const slides: SlideGerado[] = [];
  for (const item of dados) {
    const valido =
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).titulo === 'string' &&
      ((item as Record<string, unknown>).titulo as string).trim() !== '' &&
      Array.isArray((item as Record<string, unknown>).topicos) &&
      ((item as Record<string, unknown>).topicos as unknown[]).length > 0 &&
      ((item as Record<string, unknown>).topicos as unknown[]).every(
        (t) => typeof t === 'string' && t.trim() !== '',
      ) &&
      typeof (item as Record<string, unknown>).promptImagem === 'string' &&
      ((item as Record<string, unknown>).promptImagem as string).trim() !== '';

    if (!valido) {
      throw new Error('A IA devolveu um slide malformado — tenta de novo.');
    }

    const obj = item as { titulo: string; topicos: string[]; promptImagem: string };
    slides.push({
      titulo: obj.titulo.trim(),
      topicos: obj.topicos.map((t) => t.trim()),
      promptImagem: obj.promptImagem.trim(),
    });
  }
  return slides;
}

/** Sufixo aplicado a todo `promptImagem` — mesmo estilo visual em
 * todos os slides de uma apresentação (consistência), e reforça "sem
 * texto na imagem" (Flux, como a maioria dos modelos de difusão, é
 * ruim escrevendo texto legível dentro da imagem — mais confiável
 * pedir pra evitar do que tentar controlar o texto gerado). */
export function montarPromptImagemSlide(promptImagem: string): string {
  return `${promptImagem}. Simple educational illustration, flat design, vibrant colors, no text, no letters, no words.`;
}
