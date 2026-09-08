import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from './Button';

type EmptyStateProps = {
  titulo: string;
  descricao?: string;
  onTentarNovo?: () => void;
  /** Ícone do "cartão" ilustrativo (Ionicons). Por padrão usa uma caixa
   * vazia; passe um ícone temático (ex.: "chatbubbles-outline") quando
   * fizer sentido pro contexto da lista. Erro de rede já cai sozinho
   * pra um ícone de "sem conexão" quando `onTentarNovo` existe. */
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Estado "vazio" ou "erro" de uma lista (brief seção 8: "Toda lista tem
 * três estados desenhados: carregando, vazio, com dado. Nunca deixe a
 * tela em branco"). `onTentarNovo` só aparece quando faz sentido tentar
 * de novo (erro de rede) — vazio de verdade não precisa de botão.
 */
export function EmptyState({ titulo, descricao, onTentarNovo, icon }: EmptyStateProps) {
  const nomeIcone = icon ?? (onTentarNovo ? 'cloud-offline-outline' : 'file-tray-outline');

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
        <Ionicons name={nomeIcone} size={36} color="#8B5CF6" />
      </View>
      <Text className="text-center text-base font-medium text-slate-300">{titulo}</Text>
      {descricao ? <Text className="text-center text-sm text-slate-400">{descricao}</Text> : null}
      {onTentarNovo ? (
        <View className="mt-3">
          <Button
            label="Tentar de novo"
            icon="refresh"
            variant="secondary"
            onPress={onTentarNovo}
          />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color="#8B5CF6" />
    </View>
  );
}
