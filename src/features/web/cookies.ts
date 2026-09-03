import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'turma-mais:cookies-consentimento';

export type ConsentimentoCookies = 'aceito' | 'recusado';

/** Só é relevante no target web — o app nativo não usa cookie nenhum, só
 * o mesmo AsyncStorage local de sempre. Aqui guardamos a escolha do
 * próprio aviso de cookies, pra não perguntar de novo a cada visita. */
export async function carregarConsentimentoCookies(): Promise<ConsentimentoCookies | null> {
  const valor = await AsyncStorage.getItem(CHAVE);
  return valor === 'aceito' || valor === 'recusado' ? valor : null;
}

export async function salvarConsentimentoCookies(valor: ConsentimentoCookies) {
  await AsyncStorage.setItem(CHAVE, valor);
}
