/**
 * Repetição espaçada (SM-2 simplificado — a versão completa do SuperMemo-2
 * usa "qualidade de resposta" de 0-5; aqui reduzimos pra 3 botões que fazem
 * sentido pra um aluno, "comece simples" como o brief original pede pro
 * filtro de palavrões).
 *
 * `dataBase` é injetável (não usa `new Date()` direto dentro da função)
 * por dois motivos: testabilidade, e porque — diferente de um prazo de
 * segurança tipo "silenciar usuário" (ver CLAUDE.md) — aqui o "agora" vem
 * do dispositivo do próprio aluno de propósito. Não é uma janela que
 * alguém ganha algo tentando burlar: na pior hipótese, um relógio errado
 * faz um cartão aparecer "devido" um dia cedo ou tarde de mais pro dono
 * dele mesmo revisar — sem risco de segurança, então não precisa do
 * server round-trip que o caso do silenciamento exigiu.
 */
export type QualidadeRevisao = 'errei' | 'dificil' | 'facil';

export type EstadoRevisao = {
  intervaloDias: number;
  fatorFacilidade: number;
};

export type ResultadoRevisao = EstadoRevisao & {
  proximaRevisao: string; // ISO YYYY-MM-DD
};

const FATOR_MINIMO = 1.3;

function paraISODate(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Calcula o próximo intervalo/fator e a data da próxima revisão a partir
 * da qualidade que o aluno reportou pra revisão atual. */
export function calcularProximaRevisao(
  estado: EstadoRevisao,
  qualidade: QualidadeRevisao,
  dataBase: Date = new Date(),
): ResultadoRevisao {
  let { intervaloDias, fatorFacilidade } = estado;

  if (qualidade === 'errei') {
    // Errou: volta pro início (revisa de novo amanhã), fator cai um pouco
    // (mas nunca abaixo do mínimo — fator muito baixo faria o intervalo
    // nunca crescer de verdade).
    intervaloDias = 1;
    fatorFacilidade = Math.max(FATOR_MINIMO, fatorFacilidade - 0.2);
  } else {
    if (qualidade === 'dificil') {
      fatorFacilidade = Math.max(FATOR_MINIMO, fatorFacilidade - 0.15);
    } else {
      fatorFacilidade = fatorFacilidade + 0.1;
    }
    // Primeiro acerto (intervalo ainda em 1) pula direto pra 6 dias —
    // multiplicar 1 pelo fator daria só ~2.5, devagar de mais pro
    // primeiro passo (mesma ideia do SM-2 original: 1 → 6 → fator×fator...).
    intervaloDias = intervaloDias <= 1 ? 6 : Math.round(intervaloDias * fatorFacilidade);
  }

  const proxima = new Date(dataBase);
  proxima.setDate(proxima.getDate() + intervaloDias);

  return {
    intervaloDias,
    fatorFacilidade: Math.round(fatorFacilidade * 100) / 100,
    proximaRevisao: paraISODate(proxima),
  };
}

/** Cartões com `proxima_revisao` hoje ou atrasada — os "devidos" pra
 * revisar agora. Recebe só os campos que precisa (não o tipo completo do
 * banco), fica testável sem depender do schema do Supabase. */
export function filtrarDevidos<T extends { proximaRevisao: string }>(
  cartoes: T[],
  hoje: Date = new Date(),
): T[] {
  const hojeISO = paraISODate(hoje);
  return cartoes.filter((c) => c.proximaRevisao <= hojeISO);
}
