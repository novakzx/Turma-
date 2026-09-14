import { supabase } from './supabase';

/**
 * Assina vários caminhos do Storage numa chamada só, em vez de uma
 * chamada por imagem. Achado do usuário ("demora muito pra carregar as
 * imagens ao entrar no app"): cada `<ImagemPost>`/`<FotoPerfil>` pedia a
 * própria URL assinada (`createSignedUrl`, singular) de forma
 * independente — um feed com 10 posts com foto + 10 avatares virava 20
 * requisições HTTP de assinatura, todas antes de sequer começar a
 * baixar o *bytes* de qualquer imagem. `createSignedUrls` (plural) faz
 * a mesma coisa pra uma lista inteira de caminhos numa única ida ao
 * Storage — daí cada imagem só falta buscar os próprios bytes, sem
 * esperar mais nenhuma chamada de rede antes.
 *
 * Retorna um Map caminho→URL; caminho que falhou em assinar (arquivo
 * apagado, etc.) simplesmente não entra no Map — quem chama trata como
 * "sem imagem" em vez de quebrar a lista inteira por causa de um item.
 */
export async function assinarUrlsEmLote(
  bucket: string,
  caminhos: string[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(caminhos)];
  if (unicos.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unicos, 60 * 60);
  if (error) throw error;

  const mapa = new Map<string, string>();
  for (const item of data) {
    if (item.signedUrl && !item.error) mapa.set(item.path ?? '', item.signedUrl);
  }
  return mapa;
}
