import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';

import { denunciar } from './api';
import type { TipoConteudoDenuncia } from './types';

/**
 * "Botão de denúncia visível em todo post e comentário" (brief 6.4/7).
 * Formulário inline (não Alert.prompt — só existe no iOS, ver lição da
 * Fase 3) que vira "Denúncia enviada" depois de enviado, sem dar pra
 * mandar duas vezes a mesma denúncia por engano.
 */
export function BotaoDenunciar({
  tipoConteudo,
  conteudoId,
}: {
  tipoConteudo: TipoConteudoDenuncia;
  conteudoId: string;
}) {
  const { profile } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: denunciar,
    onSuccess: () => {
      setEnviado(true);
      setAberto(false);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  if (enviado) {
    return (
      <View className="flex-row items-center gap-1">
        <Ionicons name="checkmark-circle" size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-500 dark:text-slate-400">Denúncia enviada</Text>
      </View>
    );
  }

  if (!aberto) {
    return (
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Denunciar"
        className="min-h-11 min-w-11 flex-row items-center gap-1 px-2"
      >
        <Ionicons name="flag-outline" size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-500 dark:text-slate-400">Denunciar</Text>
      </Pressable>
    );
  }

  function handleEnviar() {
    if (!profile?.escola_id) return;
    if (!motivo.trim()) {
      setErro('Conta o motivo da denúncia.');
      return;
    }
    setErro(null);
    mutation.mutate({
      tipoConteudo,
      conteudoId,
      denuncianteId: profile.id,
      escolaId: profile.escola_id,
      motivo: motivo.trim(),
    });
  }

  return (
    <View className="w-full gap-2 rounded-2xl border border-slate-100 bg-surface p-3 dark:border-slate-800 dark:bg-surface-dark">
      <TextField
        label="Motivo da denúncia"
        icon="flag-outline"
        value={motivo}
        onChangeText={setMotivo}
        error={erro ?? undefined}
        multiline
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="Cancelar" variant="secondary" onPress={() => setAberto(false)} />
        </View>
        <View className="flex-1">
          <Button
            label="Enviar"
            icon="paper-plane-outline"
            onPress={handleEnviar}
            loading={mutation.isPending}
          />
        </View>
      </View>
    </View>
  );
}
