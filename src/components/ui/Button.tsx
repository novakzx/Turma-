import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

/**
 * Botão padrão do app. Só fica desabilitado durante a requisição (`loading`)
 * — nunca antes disso por causa de validação (brief seção 8: "desabilita só
 * durante a requisição... nunca trave o botão antes disso"). A validação de
 * formulário mostra erro inline no clique, em vez de travar o botão.
 */
export function Button({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  ...pressableProps
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-11 items-center justify-center rounded-lg px-4 py-3 ${
        isPrimary ? 'bg-primary dark:bg-primary-dark' : 'bg-transparent'
      } ${isDisabled ? 'opacity-60' : ''}`}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#4F46E5'} />
      ) : (
        <Text
          className={`text-base font-semibold ${
            isPrimary ? 'text-white' : 'text-primary dark:text-primary-dark'
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
