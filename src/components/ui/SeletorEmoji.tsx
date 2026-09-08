import { Pressable, ScrollView, Text, View } from 'react-native';

/** Lista curta e curada (não é todo o Unicode) — os emoji mais usados
 * numa conversa de aluno, o bastante pra não precisar do teclado nativo
 * (que também funciona, isto é só um atalho mais rápido). */
const EMOJIS = [
  '😀',
  '😂',
  '🥲',
  '😍',
  '😘',
  '😜',
  '🤔',
  '😎',
  '🥳',
  '😴',
  '😢',
  '😭',
  '😡',
  '😱',
  '🥶',
  '🤯',
  '🤗',
  '🙄',
  '😇',
  '🤩',
  '👍',
  '👎',
  '👏',
  '🙏',
  '💪',
  '🤝',
  '👋',
  '✌️',
  '🤞',
  '🫶',
  '❤️',
  '🔥',
  '✨',
  '🎉',
  '💯',
  '⭐',
  '☹️',
  '💀',
  '🎂',
  '📚',
  '⚽',
  '🎮',
  '🎵',
  '📸',
  '☕',
  '🍕',
  '⏰',
  '✅',
  '❌',
  '❓',
];

export function SeletorEmoji({ onSelecionar }: { onSelecionar: (emoji: string) => void }) {
  return (
    <View
      style={{ height: 220 }}
      className="border-t border-slate-800 bg-surface dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="flex-row flex-wrap gap-1 p-2">
        {EMOJIS.map((emoji, indice) => (
          <Pressable
            key={`${emoji}-${indice}`}
            onPress={() => onSelecionar(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`Emoji ${emoji}`}
            className="h-11 w-11 items-center justify-center rounded-md active:bg-slate-800"
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
