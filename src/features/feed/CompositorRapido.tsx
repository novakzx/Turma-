import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

/**
 * Caixa "o que está rolando na sua escola" no topo do feed — pedido do
 * usuário (referência visual anexada: Stitch/Material 3 tem essa caixa
 * fixa em vez de só o botão flutuante). Não é um formulário próprio —
 * cada linha só leva pra `/novo-post` (com o tipo certo pré-marcado via
 * `?tipo=`, ver `novo-post.tsx`), reusando a tela e a validação que já
 * existiam. O FAB do feed continua existindo (atalho rápido pra quem já
 * rolou a lista pra baixo).
 */
export function CompositorRapido() {
  const { profile } = useAuth();

  return (
    <View className="mx-4 mt-3 gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
      <Pressable
        onPress={() => router.push('/novo-post')}
        accessibilityRole="button"
        accessibilityLabel="Criar novo post"
        className="min-h-11 flex-row items-center gap-3"
      >
        <FotoPerfil caminho={profile?.foto_url ?? null} nome={profile?.nome ?? '?'} tamanho={36} />
        <View className="min-h-11 flex-1 justify-center rounded-full bg-slate-100 px-4">
          <Text className="text-sm text-slate-500">O que está rolando na sua escola?</Text>
        </View>
      </Pressable>

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => router.push({ pathname: '/novo-post', params: { tipo: 'foto' } })}
          accessibilityRole="button"
          accessibilityLabel="Publicar foto"
          className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 active:bg-slate-100"
        >
          <Ionicons name="image-outline" size={18} color="#0095F6" />
          <Text className="text-sm font-medium text-slate-700">Foto</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/novo-post', params: { tipo: 'enquete' } })}
          accessibilityRole="button"
          accessibilityLabel="Criar enquete"
          className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 active:bg-slate-100"
        >
          <Ionicons name="bar-chart-outline" size={18} color="#0095F6" />
          <Text className="text-sm font-medium text-slate-700">Enquete</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/novo-post')}
          accessibilityRole="button"
          accessibilityLabel="Publicar"
          className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2 dark:bg-primary-dark"
        >
          <Ionicons name="send" size={15} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">Publicar</Text>
        </Pressable>
      </View>
    </View>
  );
}
