import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

/**
 * Checkbox de consentimento com texto completo expansível (Termos de
 * Uso, ciência dos pais/responsáveis) — pedido do usuário: cadastro
 * precisa dessas duas confirmações antes de criar a conta.
 */
export function CampoConsentimento({
  marcado,
  onAlternar,
  label,
  textoCompleto,
  erro,
}: {
  marcado: boolean;
  onAlternar: () => void;
  label: string;
  textoCompleto?: string;
  erro?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <View className="gap-1.5">
      <Pressable
        onPress={onAlternar}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcado }}
        accessibilityLabel={label}
        className={`min-h-11 flex-row items-start gap-3 rounded-lg border p-3 ${
          erro ? 'border-danger dark:border-danger-dark' : 'border-slate-700'
        }`}
      >
        <View
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
            marcado
              ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
              : 'border-slate-600'
          }`}
        >
          {marcado ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 text-sm text-slate-300">{label}</Text>
      </Pressable>

      {textoCompleto ? (
        <Pressable
          onPress={() => setAberto((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={aberto ? 'Ocultar texto completo' : 'Ler texto completo'}
          className="min-h-11 self-start px-1"
        >
          <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
            {aberto ? 'Ocultar texto completo ▲' : 'Ler texto completo ▼'}
          </Text>
        </Pressable>
      ) : null}

      {aberto && textoCompleto ? (
        <ScrollView className="max-h-40 rounded-lg bg-slate-800/60 p-3">
          <Text className="text-xs leading-5 text-slate-400">{textoCompleto}</Text>
        </ScrollView>
      ) : null}

      {erro ? <Text className="px-1 text-xs text-danger dark:text-danger-dark">{erro}</Text> : null}
    </View>
  );
}
