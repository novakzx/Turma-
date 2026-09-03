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
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, icon, ...inputProps },
  ref,
) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Text>
      <View
        className={`min-h-11 flex-row items-center gap-2 rounded-2xl border bg-surface px-4 py-2 dark:bg-surface-dark ${
          error ? 'border-danger dark:border-danger-dark' : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        {icon ? <Ionicons name={icon} size={18} color="#94A3B8" /> : null}
        <TextInput
          ref={ref}
          className="min-h-11 flex-1 text-base text-slate-900 dark:text-slate-100"
          placeholderTextColor="#94A3B8"
          {...inputProps}
        />
      </View>
      {error ? (
        <View className="flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        </View>
      ) : null}
    </View>
  );
});
