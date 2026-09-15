import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { atualizarSenha } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';

/**
 * Só alcançável com uma sessão de recuperação ativa
 * (`isPasswordRecovery`, ver `app/_layout.tsx` e `AuthProvider.tsx`) —
 * não tem link nenhum pra cá dentro do app, só chega aqui vindo do
 * e-mail de "esqueci minha senha".
 */
export default function RedefinirSenhaScreen() {
  const { limparRecuperacaoSenha } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmarSenha?: string; geral?: string }>(
    {},
  );

  const mutation = useMutation({
    mutationFn: atualizarSenha,
    // Sucesso: sai do "modo recuperação" — o RootNavigator então decide
    // a tela normal (cadastro/onboarding/app) com base na sessão que já
    // estava válida o tempo todo, sem precisar logar de novo.
    onSuccess: () => limparRecuperacaoSenha(),
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  function handleSubmit() {
    const novosErros: typeof erros = {};
    if (senha.length < 6) novosErros.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (confirmarSenha !== senha) novosErros.confirmarSenha = 'As senhas não coincidem.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    mutation.mutate(senha);
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
        <View className="mb-2 items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
            <Ionicons name="lock-open-outline" size={28} color="#0095F6" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-slate-900">Nova senha</Text>
            <Text className="text-center text-base text-slate-500">
              Escolhe uma senha nova pra tua conta.
            </Text>
          </View>
        </View>

        <TextField
          label="Nova senha"
          icon="lock-closed-outline"
          value={senha}
          onChangeText={setSenha}
          error={erros.senha}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />
        <TextField
          label="Confirmar nova senha"
          icon="lock-closed-outline"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          error={erros.confirmarSenha}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />

        {erros.geral ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#F87171" />
            <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
          </View>
        ) : null}

        <Button
          label="Salvar nova senha"
          icon="checkmark"
          onPress={handleSubmit}
          loading={mutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
