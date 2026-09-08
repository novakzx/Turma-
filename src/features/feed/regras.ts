/**
 * Agregação de votos de uma enquete — separado de `buscarEnquete`
 * (api.ts) pra poder testar sem precisar de banco, mesmo padrão de
 * `notas/regras.ts` e `estudo/regras.ts`.
 */

export type VotoEnquete = { opcao_id: string; votante_id: string };
export type OpcaoEnqueteBase = { id: string };

export type ResultadoEnquete = {
  contagemPorOpcao: Record<string, number>;
  totalVotos: number;
  meuVotoOpcaoId: string | null;
};

export function calcularResultadoEnquete(
  opcoes: OpcaoEnqueteBase[],
  votos: VotoEnquete[],
  votanteId: string,
): ResultadoEnquete {
  const contagemPorOpcao: Record<string, number> = {};
  for (const opcao of opcoes) contagemPorOpcao[opcao.id] = 0;
  for (const voto of votos) {
    contagemPorOpcao[voto.opcao_id] = (contagemPorOpcao[voto.opcao_id] ?? 0) + 1;
  }

  return {
    contagemPorOpcao,
    totalVotos: votos.length,
    meuVotoOpcaoId: votos.find((v) => v.votante_id === votanteId)?.opcao_id ?? null,
  };
}

/** Percentual arredondado de uma opção sobre o total de votos — `0`
 * (não `NaN`/`Infinity`) quando ninguém votou ainda, pra a barra de
 * progresso na UI nunca quebrar. */
export function calcularPercentualOpcao(votosDaOpcao: number, totalVotos: number): number {
  if (totalVotos === 0) return 0;
  return Math.round((votosDaOpcao / totalVotos) * 100);
}
