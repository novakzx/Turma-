import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

/**
 * Campo de formulário padrão do app: label + input + erro inline (brief
 * seção 8 — "Erro de validação aparece ao lado do campo"). Altura mínima
 * de 44px também é a área de toque mínima pedida no brief.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, ...inputProps },
  ref,
) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Text>
      <TextInput
        ref={ref}
        className={`min-h-11 rounded-lg border bg-surface px-3 py-2 text-base text-slate-900 dark:bg-surface-dark dark:text-slate-100 ${
          error ? 'border-danger dark:border-danger-dark' : 'border-slate-300 dark:border-slate-700'
        }`}
        placeholderTextColor="#94A3B8"
        {...inputProps}
      />
      {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
    </View>
  );
});
