/**
 * Paleta clara/escura do app — mesmos valores usados nas variáveis CSS de
 * `global.css` (fonte única: qualquer ajuste de cor precisa mudar nos
 * dois lugares, já que um é CSS puro e o outro é `vars()` do NativeWind
 * pro nativo — não dá pra compartilhar o arquivo entre os dois formatos).
 *
 * Escuro reaproveita a paleta "dark-first" que o app já teve entre as
 * fases 3 e 4 (antes do redesign claro v5) — não inventada do zero.
 */
export const CORES_CLARO = {
  '--color-background': '#FAF8FF',
  '--color-surface': '#FFFFFF',
  '--color-primary': '#8B5CF6',
  '--color-accent': '#2DD4BF',
  '--color-success': '#22C55E',
  '--color-danger': '#F87171',
  '--color-slate-100': '#F1F5F9',
  '--color-slate-200': '#E2E8F0',
  '--color-slate-300': '#CBD5E1',
  '--color-slate-500': '#64748B',
  '--color-slate-600': '#475569',
  '--color-slate-700': '#334155',
  '--color-slate-800': '#1E293B',
  '--color-slate-900': '#0F172A',
} as const;

export const CORES_ESCURO = {
  '--color-background': '#0B0E14',
  '--color-surface': '#171B26',
  '--color-primary': '#A78BFA',
  '--color-accent': '#5EEAD4',
  '--color-success': '#4ADE80',
  '--color-danger': '#FCA5A5',
  '--color-slate-100': '#1C2230',
  '--color-slate-200': '#262D39',
  '--color-slate-300': '#334155',
  '--color-slate-500': '#98A1AF',
  '--color-slate-600': '#ADB5C2',
  '--color-slate-700': '#C3CAD4',
  '--color-slate-800': '#E2E8F0',
  '--color-slate-900': '#E8EBF0',
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
    primary: escuro ? '#A78BFA' : '#8B5CF6',
    accent: escuro ? '#5EEAD4' : '#2DD4BF',
    success: escuro ? '#4ADE80' : '#22C55E',
    danger: escuro ? '#FCA5A5' : '#F87171',
    // slate-400 (não tem token de tema — só usado solto em ícone)
    mutado: escuro ? '#98A1AF' : '#94A3B8',
    // slate-500 (um pouco mais forte que `mutado`)
    mutadoForte: escuro ? '#ADB5C2' : '#64748B',
    // tom escuro customizado (ícone tipo "voltar"/chevron)
    neutro: escuro ? '#C3CAD4' : '#464555',
    branco: '#FFFFFF',
  };
}
