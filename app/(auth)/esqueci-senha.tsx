import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { solicitarRedefinicaoSenha } from '@/features/auth/api';
import { mensagemDeErro } from '@/features/auth/errors';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviado, setEnviado] = useState(false);

  const mutation = useMutation({
    mutationFn: solicitarRedefinicaoSenha,
    onSuccess: () => setEnviado(true),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleSubmit() {
    if (!REGEX_EMAIL.test(email.trim())) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setErro(undefined);
    mutation.mutate(email.trim());
  }

  if (enviado) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8 dark:bg-background-dark">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="mail-unread-outline" size={36} color="#0095F6" />
        </View>
        <Text className="text-center text-2xl font-bold text-primary dark:text-primary-dark">
          Verifica seu e-mail
        </Text>
        {/* Mensagem genérica de propósito — nem confirma nem nega que
            existe conta com esse e-mail (achado da auditoria de
            segurança em `signIn`: vazar isso permite descobrir quem tem
            conta aqui só tentando e-mails). O próprio Supabase já se
            comporta assim: sempre responde sucesso. */}
        <Text className="text-center text-base text-slate-500">
          Se existir uma conta com{' '}
          <Text className="font-semibold text-slate-800">{email.trim()}</Text>, mandamos um link
          pra redefinir a senha. Abre sua caixa de entrada (e o spam, só por garantia).
        </Text>
        <View className="mt-2 w-full">
          <Button
            label="Voltar pro login"
            icon="arrow-back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
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
        <View className="mb-2 items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
            <Ionicons name="key-outline" size={28} color="#0095F6" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-slate-900">Esqueceu a senha?</Text>
            <Text className="text-center text-base text-slate-500">
              Informa o e-mail que usaste no cadastro — mandamos um link pra redefinir.
            </Text>
          </View>
        </View>

        <TextField
          label="E-mail"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          error={erro}
          placeholder="ex.: maria@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Button
          label="Enviar link"
          icon="paper-plane-outline"
          onPress={handleSubmit}
          loading={mutation.isPending}
        />
        <Button
          label="Voltar"
          icon="arrow-back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
