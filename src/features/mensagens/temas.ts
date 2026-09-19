/**
 * Temas visuais de conversa (pedido do usuário — anexou print de um
 * app de mensagens com fundo em gradiente colorido por conversa,
 * "deixe tipo assim os temas"; recurso Premium — já citado assim na
 * própria descrição do banner de upsell, `BannerPremium.tsx`: "IA sem
 * limites, ferramentas de estudo extras, foguinho e temas exclusivos",
 * escrito antes deste recurso existir de verdade). Cada tema é só uma
 * paleta — gradiente de fundo + cor dos dois lados do balão — aplicada
 * por cima da MESMA estrutura de tela de sempre (nenhum layout novo).
 *
 * A chave (`id`) é o que fica salvo em `conversas.tema` — trocar uma
 * cor aqui não precisa de migration, e adicionar um tema novo é só
 * acrescentar uma entrada nesta lista.
 */

export type TemaConversa = {
  id: string;
  nome: string;
  /** Emoji pequeno pra representar o tema no seletor — não é ícone do
   * Ionicons de propósito, os temas são coloridos/lúdicos, um emoji
   * comunica isso melhor que um ícone de linha monocromático. */
  emoji: string;
  gradiente: readonly [string, string, ...string[]];
  /** Cor do balão de quem está vendo a tela (lado direito). */
  corMinha: string;
  /** Cor do balão do outro participante (lado esquerdo) — sempre um
   * tom translúcido claro por cima do gradiente, pra continuar legível
   * em qualquer uma das paletas. */
  corOutra: string;
  /** Cor do texto dentro do balão do outro participante — a maioria
   * dos gradientes é escura/saturada o bastante pra pedir texto claro
   * mesmo no balão "claro". */
  corTextoOutra: string;
};

export const TEMAS_CONVERSA: readonly TemaConversa[] = [
  {
    id: 'paixao',
    nome: 'Paixão',
    emoji: '💕',
    gradiente: ['#F72585', '#B5179E', '#7209B7'],
    corMinha: '#F72585',
    corOutra: 'rgba(255,255,255,0.22)',
    corTextoOutra: '#FFFFFF',
  },
  {
    id: 'doce',
    nome: 'Doce',
    emoji: '🍬',
    gradiente: ['#0BC6C1', '#37D6B0', '#8CF2A0'],
    corMinha: '#0891B2',
    corOutra: 'rgba(255,255,255,0.28)',
    corTextoOutra: '#0A3A3A',
  },
  {
    id: 'poeira_estelar',
    nome: 'Poeira estelar',
    emoji: '🌌',
    gradiente: ['#1E1B4B', '#4C1D95', '#7C3AED'],
    corMinha: '#8B5CF6',
    corOutra: 'rgba(255,255,255,0.16)',
    corTextoOutra: '#FFFFFF',
  },
  {
    id: 'por_do_sol',
    nome: 'Pôr do sol',
    emoji: '🌅',
    gradiente: ['#FF7E5F', '#FEB47B', '#FFD97D'],
    corMinha: '#EA580C',
    corOutra: 'rgba(255,255,255,0.32)',
    corTextoOutra: '#5A2A00',
  },
  {
    id: 'oceano',
    nome: 'Oceano',
    emoji: '🌊',
    gradiente: ['#0F2A4A', '#134E5E', '#0095F6'],
    corMinha: '#0095F6',
    corOutra: 'rgba(255,255,255,0.18)',
    corTextoOutra: '#FFFFFF',
  },
] as const;

export function buscarTemaConversa(id: string | null | undefined): TemaConversa | null {
  if (!id) return null;
  return TEMAS_CONVERSA.find((t) => t.id === id) ?? null;
}
