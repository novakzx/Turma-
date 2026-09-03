import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { mensagemDeErro } from '@/features/auth/errors';

import { silenciarUsuario } from './api';

/** Moderação (brief 6.5: "silenciar usuário") — só aparece pra staff,
 * chamado de dentro da sala de chat na mensagem de outra pessoa.
 * "1 hora" e "24 horas" cobrem os dois casos de uso mais comuns sem
 * exigir um seletor de data completo pra uma ação rápida de moderação.
 * Não tem query própria de perfil de outra pessoa pra invalidar aqui —
 * quem sente o efeito é o cliente do próprio silenciado, na próxima
 * leitura do perfil dele. */
export function BotaoSilenciar({ perfilId }: { perfilId: string }) {
  const [aberto, setAberto] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (horas: number) => silenciarUsuario(perfilId, horas),
    onSuccess: () => {
      setFeito(true);
      setAberto(false);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  if (feito) {
    return (
      <View className="flex-row items-center gap-1">
        <Ionicons name="volume-mute" size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-500 dark:text-slate-400">Usuário silenciado</Text>
      </View>
    );
  }

  if (!aberto) {
    return (
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Silenciar usuário"
        className="min-h-11 min-w-11 flex-row items-center gap-1 px-2"
      >
        <Ionicons name="volume-mute-outline" size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-500 dark:text-slate-400">Silenciar</Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-1">
      <View className="flex-row gap-2 rounded-full bg-danger/5 px-1 py-0.5 dark:bg-danger-dark/10">
        <Pressable
          onPress={() => mutation.mutate(1)}
          accessibilityRole="button"
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-xs font-medium text-danger dark:text-danger-dark">1 hora</Text>
        </Pressable>
        <Pressable
          onPress={() => mutation.mutate(24)}
          accessibilityRole="button"
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-xs font-medium text-danger dark:text-danger-dark">24 horas</Text>
        </Pressable>
        <Pressable
          onPress={() => setAberto(false)}
          accessibilityRole="button"
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-xs text-slate-500 dark:text-slate-400">Cancelar</Text>
        </Pressable>
      </View>
      {erro ? <Text className="text-xs text-danger dark:text-danger-dark">{erro}</Text> : null}
    </View>
  );
}
