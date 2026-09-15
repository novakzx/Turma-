/**
 * Data de lançamento pública do site (pedido do usuário). Controla só a
 * exibição da página "em breve" no alvo web -- não é um controle de
 * segurança (a autorização de verdade é RLS pra inscrição e a senha
 * conferida na Edge Function pro painel admin). Ajuste só esta
 * constante quando a data mudar.
 */
export const DATA_LANCAMENTO = new Date('2026-09-20T00:00:00-03:00');

export function jaLancou(agora: Date = new Date()): boolean {
  return agora.getTime() >= DATA_LANCAMENTO.getTime();
}

export function diasAteLancamento(agora: Date = new Date()): number {
  const diffMs = DATA_LANCAMENTO.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export const DATA_LANCAMENTO_FORMATADA = DATA_LANCAMENTO.toLocaleDateString('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});
