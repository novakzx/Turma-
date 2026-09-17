/**
 * Sequência de conversa / "foguinho" entre dois amigos (pedido do
 * usuário: "tipo o do tiktok") — dias seguidos em que os DOIS
 * participantes de uma conversa direta mandaram pelo menos uma
 * mensagem (não basta só um dos dois escrever, diferente da sequência
 * de estudos que é individual). Lógica pura, sem import de Supabase —
 * mesmo padrão de `estudo/regras.ts`.
 */

export type MensagemParaSequencia = { autor_id: string; criado_em: string };

/**
 * Se hoje ainda não teve mensagem dos dois, a sequência continua "viva"
 * a partir de ontem (mesma lógica do `calcularSequenciaEstudos`) — só
 * zera quando nem ontem os dois mandaram mensagem. `agora` é parâmetro
 * pra dar pra testar sem depender do relógio de verdade.
 */
export function calcularSequenciaConversa(
  mensagens: MensagemParaSequencia[],
  participanteA: string,
  participanteB: string,
  agora: Date = new Date(),
): number {
  const autoresPorDia = new Map<string, Set<string>>();
  for (const mensagem of mensagens) {
    const dia = new Date(mensagem.criado_em).toDateString();
    const autores = autoresPorDia.get(dia) ?? new Set<string>();
    autores.add(mensagem.autor_id);
    autoresPorDia.set(dia, autores);
  }

  function ambosMandaramNoDia(data: Date): boolean {
    const autores = autoresPorDia.get(data.toDateString());
    return !!autores && autores.has(participanteA) && autores.has(participanteB);
  }

  const cursor = new Date(agora);
  if (!ambosMandaramNoDia(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let sequencia = 0;
  while (ambosMandaramNoDia(cursor)) {
    sequencia += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return sequencia;
}
