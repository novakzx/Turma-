import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

function formatarTempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

/**
 * Bolha de áudio recebido — play/pause + tempo, sem barra de progresso
 * arrastável (comece simples: o essencial de mandar/ouvir áudio já
 * resolve o pedido do usuário, sem precisar de waveform/scrubber).
 * `obterUrl` busca a URL assinada certa (conversa ou sala — cada chat
 * tem seu próprio bucket privado, ver `mensagens/api.ts`/`chat/api.ts`).
 */
export function BolhaAudio({
  caminho,
  obterUrl,
  corIcone = '#FFFFFF',
  corTexto = 'text-white',
}: {
  caminho: string;
  obterUrl: (caminho: string) => Promise<string>;
  corIcone?: string;
  corTexto?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ['url-assinada-audio', caminho],
    queryFn: () => obterUrl(caminho),
    staleTime: 50 * 60 * 1000,
  });

  const player = useAudioPlayer(url ?? null);
  const status = useAudioPlayerStatus(player);

  function alternarReproducao() {
    if (!url) return;
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  }

  return (
    <Pressable
      onPress={alternarReproducao}
      disabled={!url}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pausar áudio' : 'Tocar áudio'}
      className="min-h-11 min-w-40 flex-row items-center gap-2"
    >
      <Ionicons name={status.playing ? 'pause-circle' : 'play-circle'} size={32} color={corIcone} />
      <View className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
        <View
          className="h-1 rounded-full bg-white"
          style={{
            width: `${status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
          }}
        />
      </View>
      <Text className={`text-xs ${corTexto}`}>
        {formatarTempo(
          status.playing || status.currentTime > 0 ? status.currentTime : status.duration,
        )}
      </Text>
    </Pressable>
  );
}
