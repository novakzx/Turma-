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
// Validação simples de formato, não de existência de verdade — o
// Supabase já recusa endereço inválido/duplicado na hora (ver
// `errors.ts`), isso aqui só evita mandar algo obviamente errado.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Erros = {
  nome?: string;
  email?: string;
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
  const [email, setEmail] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [idade, setIdade] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [consentimentoResponsavel, setConsentimentoResponsavel] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  // E-mail real de novo (pedido do usuário, depois de configurar o SMTP
  // do Resend) — com "Confirm email" ligado, signUp não volta mais com
  // sessão na hora; precisa de um estado próprio pra essa espera (não é
  // erro nenhum, é o fluxo esperado agora).
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  const mutation = useMutation({
    mutationFn: signUp,
    // Achado testando de verdade ("o e-mail não chega"): quando o
    // e-mail informado já pertence a uma conta existente, o Supabase
    // (de propósito, pra não vazar "esse e-mail já tem conta" — ver
    // docs do `signUp`) devolve sucesso e `confirmation_sent_at`
    // preenchido igual um cadastro novo de verdade, MAS não manda
    // e-mail nenhum de fato — o único jeito de diferenciar os dois
    // casos no cliente é `user.identities` vir vazio (`[]`) só quando
    // já existia conta antes. Sem esse check, a tela mostrava "Confirme
    // seu e-mail" mesmo quando não tinha sido enviado nada.
    onSuccess: (data) => {
      if (!data.session) {
        if (data.user?.identities?.length === 0) {
          setErros({
            geral:
              'Já existe uma conta com esse e-mail. Tenta entrar em vez de criar outra — se esqueceu a senha, fale com a coordenação por enquanto ("esqueci minha senha" ainda não existe).',
          });
        } else {
          setAguardandoConfirmacao(true);
        }
      }
      // Se vier com sessão (ex.: "Confirm email" acabar desligado de
      // novo por engano), o AuthProvider troca de tela sozinho
      // (Stack.Protected) — nada a fazer aqui nesse caso.
    },
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  const [verificandoUsuario, setVerificandoUsuario] = useState(false);

  async function handleSubmit() {
    const novosErros: Erros = {};
    if (!nome.trim()) novosErros.nome = 'Informe seu nome.';
    if (!REGEX_EMAIL.test(email.trim())) novosErros.email = 'Informe um e-mail válido.';

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
      email: email.trim(),
      nomeUsuario: usuarioLimpo,
      idade: idadeNumero,
      senha,
      aceitouTermos,
      consentimentoResponsavel,
    });
  }

  if (aguardandoConfirmacao) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8 dark:bg-background-dark">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="mail-unread-outline" size={36} color="#4F46E5" />
        </View>
        <Text className="text-center text-2xl font-bold text-primary dark:text-primary-dark">
          Confirme seu e-mail
        </Text>
        <Text className="text-center text-base text-slate-600 dark:text-slate-400">
          Mandamos um link de confirmação pra{' '}
          <Text className="font-semibold text-slate-800 dark:text-slate-200">{email.trim()}</Text>.
          Abre sua caixa de entrada (e o spam, só por garantia) e toca no link pra ativar sua conta.
        </Text>
        <View className="mt-2 w-full">
          <Button
            label="Já tenho conta"
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
          label="E-mail"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          error={erros.email}
          placeholder="ex.: maria@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
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
