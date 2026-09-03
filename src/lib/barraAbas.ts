import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Barra de abas flutuante (Fase 6, `(tabs)/_layout.tsx`): `position:
 * absolute` com altura e margem fixas. O bug real (relatado no iPhone):
 * a margem inferior era um `16` fixo, sem somar o inset de segurança do
 * sistema (home indicator no iPhone, barra de gestos no Android) — no
 * simulador/preview web isso nem aparece (sem inset), mas num iPhone de
 * verdade o inset "empurra" a área seura pra cima, e a barra (calculada
 * sem esse espaço extra) acaba renderizando mais alto/baixo do que a
 * tela realmente reserva, sobrando espaço que a barra cobre por cima do
 * conteúdo.
 *
 * Única fonte desses números — usada tanto pra posicionar a própria
 * barra (`tabBarStyle.bottom`) quanto pra reservar espaço em qualquer
 * tela com conteúdo colado na base (hoje só `estudo.tsx`, a linha de
 * enviar mensagem) — pra nunca dessincronizar os dois de novo.
 */
export const ALTURA_BARRA_ABAS = 64;
export const MARGEM_BARRA_ABAS = 16;

/** Distância do fundo da tela até a barra (pé da barra) — pra usar em `tabBarStyle.bottom`. */
export function useDistanciaFundoBarraAbas(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + MARGEM_BARRA_ABAS;
}

/** Espaço total que a barra ocupa a partir do fundo da tela (topo da barra até o fundo) —
 * pra reservar como padding-bottom em telas com conteúdo colado na base. */
export function useEspacoReservadoBarraAbas(): number {
  return useDistanciaFundoBarraAbas() + ALTURA_BARRA_ABAS;
}
