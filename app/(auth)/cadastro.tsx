import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { CampoConsentimento } from '@/components/ui/CampoConsentimento';
import { TextField } from '@/components/ui/TextField';
import { nomeUsuarioDisponivel, signUp } from '@/features/auth/api';
import { mensagemDeErro } from '@/features/auth/errors';
import { CONSENTIMENTO_RESPONSAVEIS, TERMOS_DE_USO } from '@/features/auth/termos';

const REGEX_NOME_USUARIO = /^[a-z0-9_]{3,20}$/;

type Erros = {
  nome?: string;
  nomeUsuario?: string;
  idade?: string;
  senha?: string;
  confirmarSenha?: string;
  termos?: string;
  consentimento?: string;
  geral?: string;
};

export default function CadastroScreen() {
  const [nome, setNome] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [idade, setIdade] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [consentimentoResponsavel, setConsentimentoResponsavel] = useState(false);
  const [erros, setErros] = useState<Erros>({});

  const mutation = useMutation({
    mutationFn: signUp,
    // Sem e-mail nenhum no cadastro (pedido do usuário) — o normal é
    // signUp voltar com sessão na hora e o AuthProvider trocar de tela
    // sozinho (Stack.Protected), sem precisar de nada aqui. **Isso só
    // funciona com "Confirm email" desligado no painel do Supabase**
    // (Authentication → Sign In / Providers → Email) — religar esse
    // toggle por engano já aconteceu mais de uma vez neste projeto. Sem
    // esse guard, a tela ficava simplesmente parada sem nenhum aviso
    // quando isso acontecia (a conta é criada mesmo assim, só nunca
    // ganha sessão) — achado testando de verdade depois de relato do
    // usuário ("tá dando erro ao se cadastrar").
    onSuccess: (data) => {
      if (!data.session) {
        setErros({
          geral:
            'Não deu pra concluir o cadastro agora — tente de novo em alguns minutos. Se continuar assim, avise a coordenação (config. do servidor precisa de ajuste).',
        });
      }
    },
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  const [verificandoUsuario, setVerificandoUsuario] = useState(false);

  async function handleSubmit() {
    const novosErros: Erros = {};
    if (!nome.trim()) novosErros.nome = 'Informe seu nome.';

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

    if (senha.length < 6) novosErros.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (confirmarSenha !== senha) novosErros.confirmarSenha = 'As senhas não coincidem.';
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
      nome: nome.trim(),
      nomeUsuario: usuarioLimpo,
      idade: idadeNumero,
      senha,
      aceitouTermos,
      consentimentoResponsavel,
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
            Criar conta
          </Text>
          <Text className="text-base text-slate-600 dark:text-slate-400">
            É rápido — depois você escolhe sua escola e turma.
          </Text>
        </View>

        <TextField
          label="Nome"
          icon="person-outline"
          value={nome}
          onChangeText={setNome}
          error={erros.nome}
          autoComplete="name"
          textContentType="name"
        />
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
        <TextField
          label="Senha"
          icon="lock-closed-outline"
          value={senha}
          onChangeText={setSenha}
          error={erros.senha}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />
        <TextField
          label="Confirmar senha"
          icon="lock-closed-outline"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          error={erros.confirmarSenha}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
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
          label="Criar conta"
          icon="person-add"
          onPress={handleSubmit}
          loading={mutation.isPending || verificandoUsuario}
        />
        <Button
          label="Já tenho conta"
          icon="arrow-back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
