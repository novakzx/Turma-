import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { signUp } from '@/features/auth/api';
import { mensagemDeErro } from '@/features/auth/errors';

type Erros = {
  nome?: string;
  email?: string;
  senha?: string;
  confirmarSenha?: string;
  geral?: string;
};

export default function CadastroScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: (data) => {
      // Sem sessão de volta = o projeto exige confirmar o e-mail antes de
      // liberar login. Com sessão, o AuthProvider já detecta sozinho e o
      // Stack.Protected troca de tela — não precisa navegar aqui.
      if (!data.session) setAguardandoConfirmacao(true);
    },
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  function handleSubmit() {
    const novosErros: Erros = {};
    if (!nome.trim()) novosErros.nome = 'Informe seu nome.';
    if (!email.trim()) novosErros.email = 'Informe seu e-mail.';
    if (senha.length < 6) novosErros.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (confirmarSenha !== senha) novosErros.confirmarSenha = 'As senhas não coincidem.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    mutation.mutate({ nome: nome.trim(), email: email.trim(), senha });
  }

  if (aguardandoConfirmacao) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-xl font-bold text-primary dark:text-primary-dark">
          Confirme seu e-mail
        </Text>
        <Text className="text-center text-base text-slate-600 dark:text-slate-400">
          Enviamos um link de confirmação pra {email}. Depois de confirmar, volte aqui e entre com
          sua senha.
        </Text>
        <Button label="Ir para o login" onPress={() => router.replace('/')} />
      </View>
    );
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
        <View className="mb-2 gap-1">
          <Text className="text-3xl font-bold text-primary dark:text-primary-dark">
            Criar conta
          </Text>
          <Text className="text-base text-slate-600 dark:text-slate-400">
            É rápido — depois você escolhe sua escola e turma.
          </Text>
        </View>

        <TextField
          label="Nome"
          value={nome}
          onChangeText={setNome}
          error={erros.nome}
          autoComplete="name"
          textContentType="name"
        />
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
          textContentType="newPassword"
        />
        <TextField
          label="Confirmar senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          error={erros.confirmarSenha}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />

        {erros.geral ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
        ) : null}

        <Button label="Criar conta" onPress={handleSubmit} loading={mutation.isPending} />
        <Button label="Já tenho conta" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
