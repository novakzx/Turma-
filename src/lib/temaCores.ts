/**
 * Paleta clara/escura do app — mesmos valores usados nas variáveis CSS de
 * `global.css` (fonte única: qualquer ajuste de cor precisa mudar nos
 * dois lugares, já que um é CSS puro e o outro é `vars()` do NativeWind
 * pro nativo — não dá pra compartilhar o arquivo entre os dois formatos).
 *
 * Paleta "newspaper column" (pedido do usuário — design de referência
 * quase monocromático, um único azul (Meta Blue) de ênfase, ver
 * `global.css` pro comentário completo). Escuro é um espelho monocromático
 * da mesma ideia (fundo quase preto, mesmo azul clareado pra contraste),
 * não faz parte da referência em si (que é só "Theme: light").
 */
export const CORES_CLARO = {
  '--color-background': '#FAFAFA',
  '--color-surface': '#FAFAFA',
  '--color-primary': '#385898',
  '--color-accent': '#385898',
  '--color-success': '#22C55E',
  '--color-danger': '#F87171',
  '--color-slate-100': '#EFEFEF',
  '--color-slate-200': '#D5D5D5',
  '--color-slate-300': '#D5D5D5',
  '--color-slate-500': '#969696',
  '--color-slate-600': '#969696',
  '--color-slate-700': '#424242',
  '--color-slate-800': '#424242',
  '--color-slate-900': '#000000',
} as const;

export const CORES_ESCURO = {
  '--color-background': '#0A0A0A',
  '--color-surface': '#141414',
  '--color-primary': '#6D93C9',
  '--color-accent': '#6D93C9',
  '--color-success': '#4ADE80',
  '--color-danger': '#FCA5A5',
  '--color-slate-100': '#1A1A1A',
  '--color-slate-200': '#2A2A2A',
  '--color-slate-300': '#3A3A3A',
  '--color-slate-500': '#8A8A8A',
  '--color-slate-600': '#9A9A9A',
  '--color-slate-700': '#B5B5B5',
  '--color-slate-800': '#D5D5D5',
  '--color-slate-900': '#F5F5F5',
} as const;

/**
 * Cor de ícone (prop `color=` do Ionicons, que não entende `className`
 * nem variável CSS — precisa do valor final já resolvido em JS). Só as
 * cores que o app já usa hoje como ícone hardcoded (ver
 * `grep -rohE 'color="#[0-9A-Fa-f]+"'`). Componente novo: prefira usar
 * `useTema().cores` a acrescentar mais uma cor solta aqui.
 */
export function paletaIcones(escuro: boolean) {
  return {
    primary: escuro ? '#6D93C9' : '#385898',
    accent: escuro ? '#6D93C9' : '#385898',
    success: escuro ? '#4ADE80' : '#22C55E',
    danger: escuro ? '#FCA5A5' : '#F87171',
    // slate-400 (não tem token de tema — só usado solto em ícone)
    mutado: escuro ? '#8A8A8A' : '#969696',
    // slate-500 (um pouco mais forte que `mutado`)
    mutadoForte: escuro ? '#9A9A9A' : '#969696',
    // tom escuro customizado (ícone tipo "voltar"/chevron)
    neutro: escuro ? '#B5B5B5' : '#424242',
    branco: '#FFFFFF',
  };
}
