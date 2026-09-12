import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

/**
 * Cabeçalho de topo (logo + nome do app + subtítulo à esquerda, sino +
 * avatar à direita) — pedido do usuário, referência visual anexada
 * (Stitch/Material 3).
 *
 * Duas peças (`HeaderEsquerda`/`HeaderDireita`), não um `headerTitle`
 * único ocupando a barra inteira: a primeira versão fazia isso e exigia
 * zerar `headerLeftContainerStyle`/`headerRightContainerStyle` (`width:
 * 0`) pra abrir espaço — funcionava bem no preview web (Chrome), mas
 * ficou "bugado" no Safari de verdade do iPhone (achado relatado pelo
 * usuário, não reproduzido no emulador de mobile do Chrome — os dois
 * motores de flexbox resolvem largura zero/`min-width` implícito de
 * jeitos diferentes o bastante pra um ficar torto e o outro não).
 * Usar `headerLeft`/`headerRight` do jeito que o React Navigation
 * documenta — cada um do tamanho do próprio conteúdo, sem forçar
 * largura de container — é o caminho testado nos dois motores.
 *
 * Sino não tem "bolinha" de não-lido de propósito: não existe hoje uma
 * lista de notificações real no app pra saber se tem algo novo — uma
 * bolinha sempre acesa seria só decoração enganosa. Leva pra
 * Configurações (onde as prefs de notificação já vivem) até o app ganhar
 * uma tela de notificações de verdade.
 */
export function HeaderEsquerda({ subtitulo }: { subtitulo: string }) {
  return (
    <View className="flex-row items-center gap-2 pl-1">
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
  );
}

export function HeaderDireita({
  acaoExtra,
}: {
  /** Ícone extra antes do sino — hoje só a lupa de "Pesquisar usuários"
   * no Feed, que já existia antes deste header (ver `(tabs)/_layout.tsx`). */
  acaoExtra?: { icone: keyof typeof Ionicons.glyphMap; label: string; aoPressionar: () => void };
}) {
  const { profile } = useAuth();

  return (
    <View className="flex-row items-center gap-1.5 pr-2">
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
  );
}
