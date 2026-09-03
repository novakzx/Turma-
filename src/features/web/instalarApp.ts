import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'turma-mais:instalar-app-dispensado';

/** Usuário já viu e fechou o aviso de "adicionar à tela inicial" (ou já
 * instalou) — não perguntar de novo. Só existe no target web. */
export async function avisoInstalarFoiDispensado(): Promise<boolean> {
  return (await AsyncStorage.getItem(CHAVE)) === '1';
}

export async function dispensarAvisoInstalar() {
  await AsyncStorage.setItem(CHAVE, '1');
}
