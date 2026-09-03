import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'turma-mais:tema-preferido';

export type TemaPreferido = 'light' | 'dark' | 'system';

/** Preferência de tema explícita do usuário (Configurações → Tema),
 * separada da preferência do sistema que o NativeWind já segue por
 * padrão — precisa persistir à mão porque `setColorScheme` do
 * NativeWind não sobrevive sozinho a um restart do app. */
export async function carregarTemaPreferido(): Promise<TemaPreferido> {
  const valor = await AsyncStorage.getItem(CHAVE);
  return valor === 'light' || valor === 'dark' ? valor : 'system';
}

export async function salvarTemaPreferido(tema: TemaPreferido) {
  await AsyncStorage.setItem(CHAVE, tema);
}
