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
    return <Text className="text-xs text-slate-500 dark:text-slate-400">Denúncia enviada</Text>;
  }

  if (!aberto) {
    return (
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Denunciar"
        className="min-h-11 min-w-11 items-center justify-center px-2"
      >
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
    <View className="w-full gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <TextField
        label="Motivo da denúncia"
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
          <Button label="Enviar" onPress={handleEnviar} loading={mutation.isPending} />
        </View>
      </View>
    </View>
  );
}
