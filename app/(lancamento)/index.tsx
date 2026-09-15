import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { inscreverAcessoAntecipado } from '@/features/lancamento/api';
import { DATA_LANCAMENTO_FORMATADA, diasAteLancamento } from '@/lib/lancamento';

type Erros = { nome?: string; telefone?: string; email?: string; geral?: string };

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function EmBreveScreen() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [enviado, setEnviado] = useState(false);

  const dias = diasAteLancamento();

  const mutation = useMutation({
    mutationFn: inscreverAcessoAntecipado,
    onSuccess: () => setEnviado(true),
    onError: (error) => setErros({ geral: error instanceof Error ? error.message : String(error) }),
  });

  function handleSubmit() {
    const novosErros: Erros = {};
    if (nome.trim().length < 2) novosErros.nome = 'Informe seu nome completo.';
    if (telefone.trim().replace(/\D/g, '').length < 8)
      novosErros.telefone = 'Informe um telefone válido.';
    if (!EMAIL_REGEX.test(email.trim())) novosErros.email = 'Informe um e-mail válido.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    mutation.mutate({ nome, telefone, email });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center gap-6 px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-xl bg-primary shadow-sm dark:bg-primary-dark">
            <Ionicons name="school" size={36} color="#FFFFFF" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-3xl font-bold text-primary dark:text-primary-dark">Turma+</Text>
            <Text className="max-w-sm text-center text-base text-slate-500">
              Mural de avisos, ferramentas de estudo e comunidade da turma num só app.
            </Text>
          </View>
        </View>

        <View className="items-center gap-1 rounded-xl border border-slate-200 bg-surface px-4 py-3 dark:bg-surface-dark">
          <Text className="text-sm font-medium text-slate-500">Chegando em</Text>
          <Text className="text-xl font-bold text-slate-900">{DATA_LANCAMENTO_FORMATADA}</Text>
          {dias > 0 ? (
            <Text className="text-sm text-slate-500">
              {dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`}
            </Text>
          ) : null}
        </View>

        {enviado ? (
          <View className="items-center gap-2 rounded-xl border border-success bg-surface px-4 py-6 dark:bg-surface-dark">
            <Ionicons name="checkmark-circle" size={40} color="#22C55E" />
            <Text className="text-center text-base font-semibold text-slate-900">
              Inscrição confirmada!
            </Text>
            <Text className="text-center text-sm text-slate-500">
              Avisamos você por e-mail assim que o Turma+ for ao ar.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-center text-base font-semibold text-slate-900">
              Garanta acesso antecipado
            </Text>

            <TextField
              label="Nome"
              icon="person-outline"
              value={nome}
              onChangeText={setNome}
              error={erros.nome}
              placeholder="Seu nome completo"
              autoCapitalize="words"
              textContentType="name"
            />
            <TextField
              label="Telefone"
              icon="call-outline"
              value={telefone}
              onChangeText={setTelefone}
              error={erros.telefone}
              placeholder="(11) 91234-5678"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            <TextField
              label="E-mail"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              error={erros.email}
              placeholder="voce@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            {erros.geral ? (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={14} color="#F87171" />
                <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
              </View>
            ) : null}

            <Button
              label="Quero acesso antecipado"
              icon="rocket-outline"
              onPress={handleSubmit}
              loading={mutation.isPending}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
