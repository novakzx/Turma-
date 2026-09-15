import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CHAVE = 'turma-mais:tema-preferido';

export type TemaPreferido = 'light' | 'dark' | 'system';

/** Preferência de tema explícita do usuário (Configurações → Tema) —
 * precisa persistir à mão porque nada disso sobrevive sozinho a um
 * restart do app (ver `TemaProvider.tsx`). */
export async function carregarTemaPreferido(): Promise<TemaPreferido> {
  const valor = await AsyncStorage.getItem(CHAVE);
  return valor === 'light' || valor === 'dark' ? valor : 'system';
}

export async function salvarTemaPreferido(tema: TemaPreferido) {
  await AsyncStorage.setItem(CHAVE, tema);
}

/**
 * Só no alvo web: marca `data-theme` em `<html>` pra `global.css` casar
 * com a camada certa da cascata (ver comentário longo lá — `:root`,
 * `@media (prefers-color-scheme)` ou `:root[data-theme]`). Isso é
 * manipulação de DOM pura, sem nenhuma relação com o mecanismo de
 * variante `dark:` do NativeWind (que é o que está quebrado no alvo web
 * — ver `global.css`); aqui só estamos mudando qual regra de CSS "puro"
 * casa, e regra de CSS "pura" (sem variante nenhuma do NativeWind) já
 * funciona normalmente.
 *
 * `preferencia === 'system'` remove o atributo (deixa a camada 2 —
 * `prefers-color-scheme` — decidir sozinha, sem flash nenhum já que é
 * avaliada pelo navegador antes de qualquer JS rodar); 'light'/'dark'
 * força a camada 3, que sempre vence.
 */
export function aplicarTemaNoDocumento(preferencia: TemaPreferido) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (preferencia === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', preferencia);
  }
}
