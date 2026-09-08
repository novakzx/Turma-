import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Barra de abas — redesenho "app profissional" (pedido do usuário):
 * trocada a barra flutuante/arredondada com sombra (Fase 6, estilo
 * Duolingo) por uma barra reta e docada na borda inferior de verdade
 * (`position` normal, não `absolute`), com uma linha de borda fina em vez
 * de sombra — visual de dashboard/app corporativo.
 *
 * Isso muda a mecânica de espaçamento: com a barra flutuante (antiga),
 * o conteúdo de cada aba ocupava a tela inteira por trás dela (`position:
 * absolute` tira a barra do fluxo normal de layout), então qualquer tela
 * com algo colado na base (só `estudo.tsx`, a linha de enviar mensagem)
 * precisava somar manualmente a altura da barra pra não ficar tampada.
 * Com a barra docada, o React Navigation já reserva o espaço dela
 * sozinho no layout — nenhuma tela dentro das abas precisa mais desse
 * cálculo manual (só o próprio inset de segurança do rodapé, que
 * qualquer tela empilhada fora das abas — `sala/[id].tsx`, `conversa/
 * [id].tsx` — já soma direto via `useSafeAreaInsets`).
 */
export const ALTURA_BARRA_ABAS = 56;

/** Altura total da barra (conteúdo + inset de segurança do rodapé) —
 * usar em `tabBarStyle.height`; o próprio `paddingBottom` soma o inset
 * dentro dela. */
export function useAlturaTotalBarraAbas(): number {
  const insets = useSafeAreaInsets();
  return ALTURA_BARRA_ABAS + insets.bottom;
}
