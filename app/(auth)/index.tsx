import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { signIn } from '@/features/auth/api';
import { mensagemDeErro } from '@/features/auth/errors';

type Erros = { email?: string; senha?: string; geral?: string };

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});

  const mutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  function handleSubmit() {
    const novosErros: Erros = {};
    if (!email.trim()) novosErros.email = 'Informe seu e-mail.';
    if (!senha) novosErros.senha = 'Informe sua senha.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    // Sucesso: o AuthProvider detecta a sessão nova (onAuthStateChange) e o
    // Stack.Protected troca de tela sozinho — não precisa navegar aqui.
    mutation.mutate({ email: email.trim(), senha });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center gap-4 px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4 gap-1">
          <Text className="text-3xl font-bold text-primary dark:text-primary-dark">Turma+</Text>
          <Text className="text-base text-slate-600 dark:text-slate-400">
            Entra com seu e-mail e senha.
          </Text>
        </View>

        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          error={erros.senha}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />

        {erros.geral ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
        ) : null}

        <Button label="Entrar" onPress={handleSubmit} loading={mutation.isPending} />
        <Button
          label="Ainda não tenho conta"
          variant="secondary"
          onPress={() => router.push('/cadastro')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
