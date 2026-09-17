import { MARCADOR_GABARITO } from './types';

/**
 * Estatística de estudo semanal (pedido do usuário) — resumo de uso do
 * chat com IA nos últimos 7 dias: quantas perguntas o aluno fez, quantas
 * matérias diferentes revisou, e em qual dia da semana estudou mais.
 * Lógica pura separada da consulta ao Supabase (ver `buscarEstatisticaSemanal`
 * em `api.ts`) pra poder testar sem precisar de banco — mesmo padrão de
 * `notas/regras.ts`.
 */

const NOMES_DIA_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

export type MensagemParaEstatistica = {
  materia_id: string;
  criado_em: string;
};

export type EstatisticaSemanal = {
  totalPerguntas: number;
  materiasRevisadas: number;
  /** `null` quando não há nenhuma pergunta na semana — não faz sentido
   * apontar um "dia mais ativo" pra zero atividade. */
  diaMaisAtivo: (typeof NOMES_DIA_SEMANA)[number] | null;
};

/**
 * Recebe só as mensagens de papel `usuario` (perguntas de verdade, não
 * as respostas da IA) já filtradas pelos últimos 7 dias — o filtro por
 * papel/período fica na consulta (`api.ts`), não aqui, pra essa função
 * ficar simples: só soma o que já chegou.
 */
export function calcularEstatisticaSemanal(
  mensagens: MensagemParaEstatistica[],
): EstatisticaSemanal {
  const materiasUnicas = new Set(mensagens.map((m) => m.materia_id));

  const contagemPorDia = new Map<number, number>();
  for (const mensagem of mensagens) {
    const diaDaSemana = new Date(mensagem.criado_em).getDay();
    contagemPorDia.set(diaDaSemana, (contagemPorDia.get(diaDaSemana) ?? 0) + 1);
  }

  let diaMaisAtivoIndice: number | null = null;
  let maiorContagem = 0;
  for (const [dia, contagem] of contagemPorDia) {
    if (contagem > maiorContagem) {
      maiorContagem = contagem;
      diaMaisAtivoIndice = dia;
    }
  }

  return {
    totalPerguntas: mensagens.length,
    materiasRevisadas: materiasUnicas.size,
    diaMaisAtivo: diaMaisAtivoIndice !== null ? NOMES_DIA_SEMANA[diaMaisAtivoIndice] : null,
  };
}

/**
 * Prova simulada (pedido do usuário): separa o enunciado da IA do gabarito,
 * escondido atrás de `MARCADOR_GABARITO` até o aluno tocar em "Ver gabarito".
 * Texto sem o marcador (resposta antiga, ou a IA não seguiu o formato pedido
 * no prompt de sistema) devolve `gabarito: null` — a UI simplesmente não
 * mostra o botão de revelar nesse caso, em vez de quebrar.
 */
export function separarGabarito(texto: string): { enunciado: string; gabarito: string | null } {
  const indice = texto.indexOf(MARCADOR_GABARITO);
  if (indice === -1) return { enunciado: texto, gabarito: null };
  return {
    enunciado: texto.slice(0, indice).trim(),
    gabarito: texto.slice(indice + MARCADOR_GABARITO.length).trim(),
  };
}

/**
 * Sequência de estudos / "foguinho" (recurso Premium, pedido do
 * usuário) — dias seguidos com pelo menos uma pergunta pro tutor de
 * IA. Recebe `criado_em` de mensagens do aluno (qualquer intervalo —
 * o filtro de janela fica em `buscarDiasComAtividade`, em `api.ts`) e
 * conta pra trás a partir de hoje.
 *
 * Se hoje ainda não tem atividade, a sequência continua "viva" a
 * partir de ontem (mesma lógica do Duolingo: não zera só porque o dia
 * ainda não acabou) — só zera de vez quando nem ontem teve atividade.
 * `agora` é parâmetro (não `new Date()` direto) pra dar pra testar sem
 * depender do relógio de verdade.
 */
export function calcularSequenciaEstudos(
  datasAtividadeIso: string[],
  agora: Date = new Date(),
): number {
  const diasComAtividade = new Set(datasAtividadeIso.map((iso) => new Date(iso).toDateString()));

  const cursor = new Date(agora);
  if (!diasComAtividade.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let sequencia = 0;
  while (diasComAtividade.has(cursor.toDateString())) {
    sequencia += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return sequencia;
}

/** `125` -> `"02:05"` — timer da prova simulada, só formatação (a
 * contagem em si é `setInterval` no componente, não precisa de teste). */
export function formatarTempo(totalSegundos: number): string {
  const segundosPositivos = Math.max(0, totalSegundos);
  const minutos = Math.floor(segundosPositivos / 60);
  const segundos = segundosPositivos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}
