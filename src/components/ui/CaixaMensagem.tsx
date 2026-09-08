import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { escolherImagem } from '@/features/feed/api';

import { SeletorEmoji } from './SeletorEmoji';

function formatarDuracao(ms: number): string {
  const segundos = Math.floor(ms / 1000);
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

/**
 * Caixa de mensagem redesenhada (pedido do usuário, com referência
 * visual mandada por print) — balão arredondado com emoji, foto e
 * áudio embutidos, no lugar do `TextField` + botão separados de antes.
 * Reusada nos dois chats do app (DM em `conversa/[id].tsx` e sala em
 * `sala/[id].tsx`) — mesmo componente, cada tela só passa os callbacks
 * de envio certos pro destino certo (mensagem direta vs. sala).
 */
export function CaixaMensagem({
  onEnviarTexto,
  onEnviarImagem,
  onEnviarAudio,
  onErro,
  enviando = false,
  placeholder = 'Mensagem...',
  desabilitado = false,
  mensagemDesabilitado,
}: {
  onEnviarTexto: (texto: string) => void;
  onEnviarImagem: (uri: string) => void;
  onEnviarAudio: (uri: string, duracaoMs: number) => void;
  onErro: (mensagem: string) => void;
  enviando?: boolean;
  placeholder?: string;
  desabilitado?: boolean;
  mensagemDesabilitado?: string;
}) {
  const [texto, setTexto] = useState('');
  const [mostrarEmoji, setMostrarEmoji] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGravacao = useAudioRecorderState(recorder, 200);

  function handleEnviarTexto() {
    if (!texto.trim()) return;
    onEnviarTexto(texto.trim());
    setTexto('');
    setMostrarEmoji(false);
  }

  async function handleIniciarGravacao() {
    try {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) {
        onErro('Sem permissão pra usar o microfone. Ative nas configurações do aparelho.');
        return;
      }
      // `allowsRecording` é global (afeta o app inteiro) — só liga na hora
      // de gravar, não desde o boot do app, pra não pedir permissão de
      // microfone de quem nunca vai mandar áudio nenhum.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      onErro('Não deu pra começar a gravar. Tenta de novo.');
    }
  }

  async function handleEscolherImagem() {
    try {
      const uri = await escolherImagem();
      if (uri) onEnviarImagem(uri);
    } catch (error) {
      onErro(error instanceof Error ? error.message : 'Não deu pra escolher a foto.');
    }
  }

  async function handlePararGravacao(enviar: boolean) {
    const duracaoMs = estadoGravacao.durationMillis;
    try {
      await recorder.stop();
    } catch {
      // Já pode ter parado sozinho (limite de tempo, app em background)
      // — segue com o que tiver em `recorder.uri` mesmo assim.
    }
    if (enviar && recorder.uri) {
      onEnviarAudio(recorder.uri, duracaoMs);
    }
  }

  if (desabilitado) {
    return (
      <View className="flex-row items-center gap-1.5 border-t border-slate-800 p-3">
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
        <Text className="flex-1 text-xs text-slate-400">{mensagemDesabilitado}</Text>
      </View>
    );
  }

  return (
    <View className="border-t border-slate-800">
      {estadoGravacao.isRecording ? (
        <View className="flex-row items-center gap-3 p-3">
          <View className="h-2.5 w-2.5 rounded-full bg-danger dark:bg-danger-dark" />
          <Text className="flex-1 text-sm text-slate-300">
            Gravando... {formatarDuracao(estadoGravacao.durationMillis)}
          </Text>
          <Pressable
            onPress={() => handlePararGravacao(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancelar gravação"
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <Ionicons name="close-circle" size={28} color="#F87171" />
          </Pressable>
          <Pressable
            onPress={() => handlePararGravacao(true)}
            accessibilityRole="button"
            accessibilityLabel="Enviar áudio"
            className="min-h-11 min-w-11 items-center justify-center"
          >
            <Ionicons name="checkmark-circle" size={28} color="#8B5CF6" />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-end gap-2 p-3">
          <View className="flex-1 flex-row items-end gap-1 rounded-3xl bg-surface px-3 py-1.5 dark:bg-surface-dark">
            <Pressable
              onPress={() => setMostrarEmoji((atual) => !atual)}
              accessibilityRole="button"
              accessibilityLabel="Emojis"
              className="min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons
                name={mostrarEmoji ? 'happy' : 'happy-outline'}
                size={22}
                color={mostrarEmoji ? '#8B5CF6' : '#94A3B8'}
              />
            </Pressable>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={placeholder}
              placeholderTextColor="#64748B"
              multiline
              className="max-h-28 flex-1 py-2 text-base text-slate-100"
              onFocus={() => setMostrarEmoji(false)}
            />
            <Pressable
              onPress={handleEscolherImagem}
              accessibilityRole="button"
              accessibilityLabel="Mandar foto"
              className="min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons name="image-outline" size={22} color="#94A3B8" />
            </Pressable>
          </View>

          <Pressable
            onPress={texto.trim() ? handleEnviarTexto : handleIniciarGravacao}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityLabel={texto.trim() ? 'Enviar' : 'Gravar áudio'}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              enviando ? 'bg-primary/60 dark:bg-primary-dark/60' : 'bg-primary dark:bg-primary-dark'
            }`}
          >
            <Ionicons name={texto.trim() ? 'send' : 'mic'} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {mostrarEmoji ? (
        <SeletorEmoji onSelecionar={(emoji) => setTexto((atual) => atual + emoji)} />
      ) : null}
    </View>
  );
}
