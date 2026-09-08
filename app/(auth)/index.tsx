import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { signIn } from '@/features/auth/api';
import { mensagemDeErro } from '@/features/auth/errors';

type Erros = { nomeUsuario?: string; senha?: string; geral?: string };

export default function LoginScreen() {
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});

  const mutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  function handleSubmit() {
    const novosErros: Erros = {};
    if (!nomeUsuario.trim()) novosErros.nomeUsuario = 'Informe seu nome de usuário.';
    if (!senha) novosErros.senha = 'Informe sua senha.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    // Sucesso: o AuthProvider detecta a sessão nova (onAuthStateChange) e o
    // Stack.Protected troca de tela sozinho — não precisa navegar aqui.
    mutation.mutate({ nomeUsuario: nomeUsuario.trim().replace(/^@/, '').toLowerCase(), senha });
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
        <View className="mb-6 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-xl bg-primary shadow-sm dark:bg-primary-dark">
            <Ionicons name="school" size={36} color="#FFFFFF" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-3xl font-bold text-primary dark:text-primary-dark">Turma+</Text>
            <Text className="text-base text-slate-400">Entra com seu usuário e senha.</Text>
          </View>
        </View>

        <TextField
          label="Nome de usuário"
          icon="at-outline"
          value={nomeUsuario}
          onChangeText={setNomeUsuario}
          error={erros.nomeUsuario}
          placeholder="ex.: mariateste"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />
        <TextField
          label="Senha"
          icon="lock-closed-outline"
          value={senha}
          onChangeText={setSenha}
          error={erros.senha}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />

        {erros.geral ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#F87171" />
            <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
          </View>
        ) : null}

        <Button
          label="Entrar"
          icon="log-in-outline"
          onPress={handleSubmit}
          loading={mutation.isPending}
        />
        <Button
          label="Ainda não tenho conta"
          icon="person-add-outline"
          variant="secondary"
          onPress={() => router.push('/cadastro')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
