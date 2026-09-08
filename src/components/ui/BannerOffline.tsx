import { Ionicons } from '@expo/vector-icons';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

/**
 * Aviso fino "sem conexão — mostrando dados salvos" (modo offline básico,
 * pedido do usuário) — só aparece quando o `onlineManager` do próprio
 * TanStack Query relata offline. No **web** isso é automático (a lib já
 * escuta `window.addEventListener('online'/'offline', ...)` sozinha); no
 * **nativo**, sem `@react-native-community/netinfo` configurado, o
 * `onlineManager` assume "sempre online" por padrão — então este banner
 * só é confiável no alvo web por enquanto (o único que este projeto
 * builda/testa de verdade até agora, ver README > "Build via EAS"). Documentado
 * como limitação, não escondido: adicionar NetInfo pro nativo é evolução
 * futura, não um bug daqui.
 */
export function BannerOffline() {
  const [online, setOnline] = useState(onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  if (online) return null;

  return (
    <View className="flex-row items-center justify-center gap-1.5 bg-accent/15 px-3 py-1.5 dark:bg-accent-dark/15">
      <Ionicons name="cloud-offline-outline" size={14} color="#F59E0B" />
      <Text className="text-xs font-medium text-accent dark:text-accent-dark">
        Sem conexão — mostrando o último dado salvo
      </Text>
    </View>
  );
}
