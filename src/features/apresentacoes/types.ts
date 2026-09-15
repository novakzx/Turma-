import type { Tables } from '@/types/database';

export type Apresentacao = Tables<'apresentacoes'>;
export type ApresentacaoSlide = Tables<'apresentacao_slides'>;

/** Um slide com a imagem já resolvida pra URL assinada (ou `null` se o
 * slide não tem imagem — geração de imagem tolera falha por slide, ver
 * `gerar-apresentacao/index.ts`). */
export type SlideComImagem = {
  ordem: number;
  titulo: string;
  topicos: string[];
  imagemUrl: string | null;
};
