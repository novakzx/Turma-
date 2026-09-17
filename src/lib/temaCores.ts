/**
 * Paleta clara/escura do app — mesmos valores usados nas variáveis CSS de
 * `global.css` (fonte única: qualquer ajuste de cor precisa mudar nos
 * dois lugares, já que um é CSS puro e o outro é `vars()` do NativeWind
 * pro nativo — não dá pra compartilhar o arquivo entre os dois formatos).
 *
 * Paleta "newspaper column" (design quase monocromático, ver `global.css`
 * pro comentário completo) — azul trocado pra `#0095F6` (pedido do
 * usuário: "estética do Instagram igual mesmo"), mesmo valor claro/escuro
 * de propósito (é assim que o próprio Instagram faz — já tem contraste
 * alto nos dois fundos). Escuro é um espelho monocromático da mesma
 * ideia (fundo quase preto).
 */
export const CORES_CLARO = {
  '--color-background': '#FAFAFA',
  '--color-surface': '#FAFAFA',
  '--color-primary': '#0095F6',
  '--color-accent': '#0095F6',
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
  '--color-primary': '#0095F6',
  '--color-accent': '#0095F6',
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
 *
 * `corPrimaria` (opcional, padrão `#0095F6`) existe pra refletir a cor
 * de destaque Premium escolhida (ver `CATALOGO_CORES_DESTAQUE` abaixo)
 * também nos ícones — sem isso, ícone que lê `cores.primary` ficaria
 * sempre azul mesmo com outro destaque escolhido (que já muda `primary`/
 * `accent` via variável CSS, mas ícone não lê variável CSS).
 */
export function paletaIcones(escuro: boolean, corPrimaria: string = '#0095F6') {
  return {
    primary: corPrimaria,
    accent: corPrimaria,
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

/**
 * Temas exclusivos (recurso Premium, pedido do usuário) — só troca a
 * cor de destaque (`primary`/`accent`); fundo, superfície e as demais
 * cores continuam as mesmas do claro/escuro normal. `azul` é o próprio
 * padrão gratuito (mantido aqui só pra "voltar ao padrão" aparecer na
 * lista de opções).
 */
export type CorDestaqueId = 'azul' | 'roxo' | 'verde' | 'laranja' | 'rosa';

export const CATALOGO_CORES_DESTAQUE: Record<
  CorDestaqueId,
  { nome: string; claro: string; escuro: string }
> = {
  azul: { nome: 'Azul (padrão)', claro: '#0095F6', escuro: '#0095F6' },
  roxo: { nome: 'Roxo', claro: '#7C3AED', escuro: '#A78BFA' },
  verde: { nome: 'Verde', claro: '#16A34A', escuro: '#4ADE80' },
  laranja: { nome: 'Laranja', claro: '#EA580C', escuro: '#FB923C' },
  rosa: { nome: 'Rosa', claro: '#DB2777', escuro: '#F472B6' },
};

/** Cor final (já resolvida claro/escuro) da cor de destaque escolhida. */
export function corDestaqueResolvida(id: CorDestaqueId, escuro: boolean): string {
  return CATALOGO_CORES_DESTAQUE[id][escuro ? 'escuro' : 'claro'];
}

/**
 * Sobrescrita das duas variáveis CSS de destaque por cima da paleta
 * claro/escuro normal (ver `TemaProvider.tsx`) — `null` pro próprio
 * `azul` (padrão), pra não sobrescrever nada à toa quando ninguém
 * escolheu um destaque diferente.
 */
export function overrideCorDestaque(id: CorDestaqueId, escuro: boolean) {
  if (id === 'azul') return null;
  const cor = corDestaqueResolvida(id, escuro);
  return { '--color-primary': cor, '--color-accent': cor } as const;
}
