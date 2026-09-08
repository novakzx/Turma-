import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Ícone opcional à esquerda do campo (Ionicons). */
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Campo de formulário padrão do app: label + input + erro inline (brief
 * seção 8 — "Erro de validação aparece ao lado do campo"). Altura mínima
 * de 44px também é a área de toque mínima pedida no brief.
 *
 * O `<Text>` do label é só visual — leitor de tela não associa ele ao
 * `TextInput` sozinho (não existe `<label for>` em React Native), então
 * o campo repete o label (+ o erro, se houver) em `accessibilityLabel`
 * pra quem usa VoiceOver/TalkBack ouvir o propósito do campo.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, icon, accessibilityLabel, ...inputProps },
  ref,
) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-300">{label}</Text>
      <View
        className={`min-h-11 flex-row items-center gap-2 rounded-lg border bg-surface px-4 py-2 dark:bg-surface-dark ${
          error ? 'border-danger dark:border-danger-dark' : 'border-slate-700'
        }`}
      >
        {icon ? <Ionicons name={icon} size={18} color="#94A3B8" /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? (error ? `${label}. Erro: ${error}` : label)}
          className="min-h-11 flex-1 text-base text-slate-100"
          placeholderTextColor="#94A3B8"
          {...inputProps}
        />
      </View>
      {error ? (
        <View className="flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={14} color="#F87171" />
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        </View>
      ) : null}
    </View>
  );
});
