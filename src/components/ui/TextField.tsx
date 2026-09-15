import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Platform, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

// `outlineStyle`/`outlineWidth` são extensões só do React Native Web (sem
// efeito e sem aviso no nativo — a lib ignora props de estilo que não
// reconhece) pro CSS `outline` de verdade, que não tem prop equivalente
// em `className`/NativeWind (o compilador da lib só traduz classe pra
// prop de estilo que o React Native já entende — uma classe sem
// equivalente, como `outline-none`, é descartada em silêncio em vez de
// virar CSS bruto, diferente do Tailwind puro). Só dá pra zerar isto
// via `style` mesmo — `as TextStyle` porque os tipos do RN não conhecem
// `outlineStyle: 'none'` (só 'solid'/'dotted'/'dashed', a extensão web
// da própria lib não está tipada upstream).
const SEM_ANEL_FOCO_WEB =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

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
 * Sem borda em repouso (pedido do usuário — "mais flat e mais simples
 * visualmente tipo o X, Instagram") — preenchimento sólido (`slate-100`)
 * no lugar da caixa com borda de antes. A borda em si não sumiu: fica
 * transparente em repouso e vira azul só no foco (`onFocus`/`onBlur`),
 * pra quem navega por teclado/leitor de tela continuar tendo um limite
 * visível de onde o campo está ativo — só não fica visível o tempo todo
 * à toa. Erro é a exceção: fica com borda vermelha sempre visível
 * (informação importante demais pra só aparecer no foco).
 *
 * O `<Text>` do label é só visual — leitor de tela não associa ele ao
 * `TextInput` sozinho (não existe `<label for>` em React Native), então
 * o campo repete o label (+ o erro, se houver) em `accessibilityLabel`
 * pra quem usa VoiceOver/TalkBack ouvir o propósito do campo.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, icon, accessibilityLabel, onFocus, onBlur, style, ...inputProps },
  ref,
) {
  const [focado, setFocado] = useState(false);

  const corBorda = error
    ? 'border-danger dark:border-danger-dark'
    : focado
      ? 'border-primary dark:border-primary-dark'
      : 'border-transparent';

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <View
        className={`min-h-11 flex-row items-center gap-2 rounded-lg border bg-slate-100 px-4 py-2 dark:bg-slate-100 ${corBorda}`}
      >
        {icon ? <Ionicons name={icon} size={18} color="#969696" /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? (error ? `${label}. Erro: ${error}` : label)}
          // Sem isso, o alvo web mostra o anel de foco PADRÃO do
          // navegador (retangular) por cima da borda azul arredondada
          // que este componente já desenha — dois indicadores de foco
          // ao mesmo tempo. Em array (não objeto espalhado) pra um
          // `style` que quem chama passe (ex.: `multiline` em
          // `novo-post.tsx`) somar em vez de substituir o de cima.
          style={[SEM_ANEL_FOCO_WEB, style]}
          className="min-h-11 flex-1 text-base text-slate-900"
          placeholderTextColor="#969696"
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
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
