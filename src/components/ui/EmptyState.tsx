import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from './Button';

type EmptyStateProps = {
  titulo: string;
  descricao?: string;
  onTentarNovo?: () => void;
};

/**
 * Estado "vazio" ou "erro" de uma lista (brief seção 8: "Toda lista tem
 * três estados desenhados: carregando, vazio, com dado. Nunca deixe a
 * tela em branco"). `onTentarNovo` só aparece quando faz sentido tentar
 * de novo (erro de rede) — vazio de verdade não precisa de botão.
 */
export function EmptyState({ titulo, descricao, onTentarNovo }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-16">
      <Text className="text-center text-base font-medium text-slate-700 dark:text-slate-300">
        {titulo}
      </Text>
      {descricao ? (
        <Text className="text-center text-sm text-slate-500 dark:text-slate-400">{descricao}</Text>
      ) : null}
      {onTentarNovo ? (
        <View className="mt-3">
          <Button label="Tentar de novo" variant="secondary" onPress={onTentarNovo} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator />
    </View>
  );
}
