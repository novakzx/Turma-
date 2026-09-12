import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

/**
 * Cabeçalho de topo — pedido do usuário ("deixe o site igual as fotos"):
 * a referência visual anexada (Stitch/Material 3) tem logo + nome do app
 * + subtítulo da tela à esquerda e sino de notificação + avatar à
 * direita em toda tela principal, bem diferente do header padrão do
 * React Navigation (só texto do título) que o app usava. Usado como
 * `headerTitle` nas telas de `(tabs)` — reaproveita o container de
 * header nativo (já tem o fundo/safe-area certos) em vez de duplicar
 * isso a mão em cada tela.
 *
 * Sino não tem "bolinha" de não-lido de propósito: não existe hoje uma
 * lista de notificações real no app pra saber se tem algo novo — uma
 * bolinha sempre acesa seria só decoração enganosa. Leva pra
 * Configurações (onde as prefs de notificação já vivem) até o app ganhar
 * uma tela de notificações de verdade.
 */
export function TopHeader({
  subtitulo,
  acaoExtra,
}: {
  subtitulo: string;
  /** Ícone extra entre o título e o sino — hoje só a lupa de "Pesquisar
   * usuários" no Feed, que já existia antes deste header (ver
   * `(tabs)/_layout.tsx`). */
  acaoExtra?: { icone: keyof typeof Ionicons.glyphMap; label: string; aoPressionar: () => void };
}) {
  const { profile } = useAuth();

  return (
    <View className="flex-1 flex-row items-center justify-between pr-1">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary dark:bg-primary-dark">
          <Ionicons name="school" size={18} color="#FFFFFF" />
        </View>
        <View>
          <Text className="text-base font-extrabold leading-none tracking-tight text-primary dark:text-primary-dark">
            Turma+
          </Text>
          <Text className="text-xs leading-tight text-slate-500">{subtitulo}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1.5">
        {acaoExtra ? (
          <Pressable
            onPress={acaoExtra.aoPressionar}
            accessibilityRole="button"
            accessibilityLabel={acaoExtra.label}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name={acaoExtra.icone} size={19} color="#464555" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push('/configuracoes')}
          accessibilityRole="button"
          accessibilityLabel="Notificações e configurações"
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
        >
          <Ionicons name="notifications-outline" size={19} color="#464555" />
        </Pressable>
        <Pressable
          onPress={() => router.push('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Seu perfil"
        >
          <FotoPerfil caminho={profile?.foto_url ?? null} nome={profile?.nome ?? '?'} tamanho={30} />
        </Pressable>
      </View>
    </View>
  );
}
