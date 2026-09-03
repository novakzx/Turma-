import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { CampoConsentimento } from '@/components/ui/CampoConsentimento';
import { TextField } from '@/components/ui/TextField';
import { completarCadastroSocial, nomeUsuarioDisponivel } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { CONSENTIMENTO_RESPONSAVEIS, TERMOS_DE_USO } from '@/features/auth/termos';

const REGEX_NOME_USUARIO = /^[a-z0-9_]{3,20}$/;

type Erros = {
  nomeUsuario?: string;
  idade?: string;
  termos?: string;
  consentimento?: string;
  geral?: string;
};

/**
 * Só aparece pra quem logou pela primeira vez com Google/Apple — esses
 * provedores não dão nome de usuário, idade nem os dois consentimentos
 * que este app exige (child safety, ver brief), diferente do cadastro
 * normal que já pede tudo antes de criar a conta. `app/_layout.tsx`
 * decide sozinho quando mostrar esta tela (`cadastroCompleto`).
 */
export default function CompletarCadastroScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [nomeUsuario, setNomeUsuario] = useState('');
  const [idade, setIdade] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [consentimentoResponsavel, setConsentimentoResponsavel] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [verificandoUsuario, setVerificandoUsuario] = useState(false);

  const mutation = useMutation({
    mutationFn: (variaveis: {
      userId: string;
      params: Parameters<typeof completarCadastroSocial>[1];
    }) => completarCadastroSocial(variaveis.userId, variaveis.params),
    // Sucesso: invalida o profile pra `cadastroCompleto` recalcular e o
    // Stack.Protected trocar de tela sozinho (pro onboarding ou pro app).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] }),
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  async function handleSubmit() {
    if (!profile) return;

    const novosErros: Erros = {};
    const usuarioLimpo = nomeUsuario.trim().replace(/^@/, '').toLowerCase();
    if (!usuarioLimpo) {
      novosErros.nomeUsuario = 'Escolha um nome de usuário.';
    } else if (!REGEX_NOME_USUARIO.test(usuarioLimpo)) {
      novosErros.nomeUsuario = 'Só letras minúsculas, número e "_", de 3 a 20 caracteres.';
    }

    const idadeNumero = Number(idade);
    if (!idade.trim() || !Number.isInteger(idadeNumero) || idadeNumero < 5 || idadeNumero > 100) {
      novosErros.idade = 'Informe uma idade válida.';
    }

    if (!aceitouTermos) novosErros.termos = 'Precisa aceitar os Termos de Uso pra continuar.';
    if (!consentimentoResponsavel) {
      novosErros.consentimento = 'Confirme que seus pais/responsáveis estão cientes.';
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setVerificandoUsuario(true);
    try {
      const disponivel = await nomeUsuarioDisponivel(usuarioLimpo);
      if (!disponivel) {
        setErros({ nomeUsuario: 'Esse nome de usuário já está em uso.' });
        return;
      }
    } catch (error) {
      setErros({ geral: mensagemDeErro(error) });
      return;
    } finally {
      setVerificandoUsuario(false);
    }

    mutation.mutate({
      userId: profile.id,
      params: {
        nomeUsuario: usuarioLimpo,
        idade: idadeNumero,
        aceitouTermos,
        consentimentoResponsavel,
      },
    });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="gap-4 px-6 py-16" keyboardShouldPersistTaps="handled">
        <View className="mb-2 gap-1">
          <Text className="text-3xl font-bold text-primary dark:text-primary-dark">
            Só mais um passo
          </Text>
          <Text className="text-base text-slate-600 dark:text-slate-400">
            Sua conta {profile?.nome ? `de ${profile.nome} ` : ''}já existe — falta só completar o
            cadastro pra continuar.
          </Text>
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
        />
        <TextField
          label="Idade"
          icon="calendar-outline"
          value={idade}
          onChangeText={(v) => setIdade(v.replace(/[^0-9]/g, ''))}
          error={erros.idade}
          keyboardType="number-pad"
          placeholder="ex.: 15"
        />

        <CampoConsentimento
          marcado={aceitouTermos}
          onAlternar={() => setAceitouTermos((v) => !v)}
          label="Li e aceito os Termos de Uso."
          textoCompleto={TERMOS_DE_USO}
          erro={erros.termos}
        />

        <CampoConsentimento
          marcado={consentimentoResponsavel}
          onAlternar={() => setConsentimentoResponsavel((v) => !v)}
          label="Confirmo que meus pais/responsáveis estão cientes da criação desta conta."
          textoCompleto={CONSENTIMENTO_RESPONSAVEIS}
          erro={erros.consentimento}
        />

        {erros.geral ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
          </View>
        ) : null}

        <Button
          label="Concluir cadastro"
          icon="checkmark-circle-outline"
          onPress={handleSubmit}
          loading={mutation.isPending || verificandoUsuario}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
