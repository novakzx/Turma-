/**
 * Calculadora de notas (brief 6.3):
 *
 *   nota_necessaria = (media_desejada * soma_dos_pesos - soma(nota_i * peso_i))
 *                     / peso_da_avaliacao_restante
 *
 * "Suporte a mais de uma avaliação pendente ao mesmo tempo" (brief) é
 * tratado somando o peso de TODAS as avaliações sem nota lançada — o
 * resultado é a média que falta tirar, em conjunto, nas que restam.
 */

export type AvaliacaoParaCalculo = {
  peso: number;
  nota: number | null;
};

export type ResultadoCalculo =
  | { status: 'ok'; notaNecessaria: number }
  /** A média pedida já está garantida mesmo tirando 0 no que falta. */
  | { status: 'ja_atingida' }
  /** Passaria da escala (ex.: precisaria de mais que 10, ou mais que 20). */
  | { status: 'impossivel' }
  /** Não há nenhuma avaliação pendente pra calcular. */
  | { status: 'sem_pendentes' };

export function calcularNotaNecessaria(params: {
  mediaDesejada: number;
  notaMaxima: number;
  avaliacoes: AvaliacaoParaCalculo[];
}): ResultadoCalculo {
  const { mediaDesejada, notaMaxima, avaliacoes } = params;

  const somaPesos = avaliacoes.reduce((acc, a) => acc + a.peso, 0);
  const pendentes = avaliacoes.filter((a) => a.nota === null);
  const pesoPendente = pendentes.reduce((acc, a) => acc + a.peso, 0);

  if (pesoPendente === 0) return { status: 'sem_pendentes' };

  const somaPonderadaLancadas = avaliacoes
    .filter((a) => a.nota !== null)
    .reduce((acc, a) => acc + (a.nota as number) * a.peso, 0);

  const notaNecessaria = (mediaDesejada * somaPesos - somaPonderadaLancadas) / pesoPendente;

  if (notaNecessaria <= 0) return { status: 'ja_atingida' };
  if (notaNecessaria > notaMaxima) return { status: 'impossivel' };
  return { status: 'ok', notaNecessaria };
}

/** Média ponderada só das avaliações que já têm nota lançada (pra mostrar
 * "sua média atual" antes mesmo de calcular o que falta). `null` quando
 * ainda não há nenhuma nota lançada. */
export function calcularMediaAtual(avaliacoes: AvaliacaoParaCalculo[]): number | null {
  const lancadas = avaliacoes.filter((a) => a.nota !== null);
  if (lancadas.length === 0) return null;
  const somaPesos = lancadas.reduce((acc, a) => acc + a.peso, 0);
  if (somaPesos === 0) return null;
  const somaPonderada = lancadas.reduce((acc, a) => acc + (a.nota as number) * a.peso, 0);
  return somaPonderada / somaPesos;
}
