import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'turma-mais:idioma-traducao';

/** Idiomas oferecidos na tradução automática de post (pedido do
 * usuário — útil pra aluno de intercâmbio/imigrante). Lista curta e
 * fixa de propósito ("comece simples") em vez de deixar digitar
 * qualquer idioma — a Gemini aceita qualquer string aqui, mas isso abriria
 * espaço pra alguém digitar instrução em vez de nome de idioma. */
export const IDIOMAS_TRADUCAO = [
  'inglês',
  'espanhol',
  'francês',
  'ucraniano',
  'crioulo cabo-verdiano',
] as const;

export type IdiomaTraducao = (typeof IDIOMAS_TRADUCAO)[number];

export async function carregarIdiomaTraducaoPreferido(): Promise<IdiomaTraducao> {
  const valor = await AsyncStorage.getItem(CHAVE);
  return (IDIOMAS_TRADUCAO as readonly string[]).includes(valor ?? '')
    ? (valor as IdiomaTraducao)
    : 'inglês';
}

export async function salvarIdiomaTraducaoPreferido(idioma: IdiomaTraducao) {
  await AsyncStorage.setItem(CHAVE, idioma);
}
