import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CorDestaqueId } from '@/lib/temaCores';

const CHAVE = 'turma-mais:cor-destaque';
const IDS_VALIDOS: CorDestaqueId[] = ['azul', 'roxo', 'verde', 'laranja', 'rosa'];

/** Preferência de cor de destaque (recurso Premium, pedido do usuário)
 * — mesmo padrão de `tema.ts`, persiste à mão porque não sobrevive
 * sozinha a um restart do app. Gate de "só assinante escolhe outra
 * cor" fica na UI (`configuracoes.tsx`), não aqui — ler/aplicar a
 * preferência já salva não tem custo nem risco nenhum mesmo se a
 * assinatura expirar depois. */
export async function carregarCorDestaque(): Promise<CorDestaqueId> {
  const valor = await AsyncStorage.getItem(CHAVE);
  return IDS_VALIDOS.includes(valor as CorDestaqueId) ? (valor as CorDestaqueId) : 'azul';
}

export async function salvarCorDestaque(cor: CorDestaqueId) {
  await AsyncStorage.setItem(CHAVE, cor);
}
