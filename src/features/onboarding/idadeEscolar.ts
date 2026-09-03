/**
 * Idade "normal" pra cada ano/série em Portugal (regra de negócio real
 * — ganha teste, ver `__tests__/idadeEscolar.test.ts`): 1º ano começa
 * com 6 anos, e cada ano seguinte soma 1 — então `idade = número do
 * ano + 5`, do 1º ao 12º.
 *
 * Pedido do usuário: comparar a idade informada no cadastro com o ano
 * letivo escolhido no onboarding e, se não bater, perguntar se o
 * aluno reprovou (e quais anos). Tolerância de 1 ano pra cima ou pra
 * baixo (aniversário perto do corte de matrícula é normal e não deve
 * disparar a pergunta à toa).
 */
const TOLERANCIA_ANOS = 1;

export function idadeEsperadaParaSerie(serieAno: string): number | null {
  const numero = Number.parseInt(serieAno.match(/\d+/)?.[0] ?? '', 10);
  if (!Number.isInteger(numero) || numero < 1 || numero > 12) return null;
  return numero + 5;
}

export function idadeBateComSerie(idade: number, serieAno: string): boolean {
  const esperada = idadeEsperadaParaSerie(serieAno);
  if (esperada === null) return true; // não dá pra avaliar, não bloqueia ninguém
  return Math.abs(idade - esperada) <= TOLERANCIA_ANOS;
}
