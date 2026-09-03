import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { atualizarEmail, atualizarSenha } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { salvarTemaPreferido, type TemaPreferido } from '@/features/configuracoes/tema';
import { atualizarPrivacidade } from '@/features/perfil/api';

const OPCOES_TEMA: {
  valor: TemaPreferido;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  { valor: 'light', rotulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'dark', rotulo: 'Escuro', icone: 'moon-outline' },
  { valor: 'system', rotulo: 'Sistema', icone: 'phone-portrait-outline' },
];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</Text>
      {children}
    </View>
  );
}

function CartaoAcaoExpansivel({
  icone,
  rotulo,
  aberto,
  onAbrir,
  onFechar,
  children,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  aberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  if (!aberto) {
    return (
      <Pressable
        onPress={onAbrir}
        accessibilityRole="button"
        className="min-h-11 flex-row items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
      >
        <Ionicons name={icone} size={18} color="#4F46E5" />
        <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">{rotulo}</Text>
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </Pressable>
    );
  }

  return (
    <View className="gap-2 rounded-2xl border border-primary/30 p-3 dark:border-primary-dark/30">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{rotulo}</Text>
        <Pressable onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={18} color="#94A3B8" />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export default function Configuracoes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { colorScheme, setColorScheme } = useColorScheme();

  const [secaoAberta, setSecaoAberta] = useState<'email' | 'senha' | null>(null);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const privacidadeMutation = useMutation({
    mutationFn: (publico: boolean) => atualizarPrivacidade(profile!.id, publico),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] }),
  });

  const emailMutation = useMutation({
    mutationFn: () => atualizarEmail(novoEmail.trim()),
    onSuccess: () => {
      setSucesso(
        'Enviamos um link de confirmação pro e-mail novo — o e-mail só muda depois de você clicar nele.',
      );
      setNovoEmail('');
      setSecaoAberta(null);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const senhaMutation = useMutation({
    mutationFn: () => atualizarSenha(novaSenha),
    onSuccess: () => {
      setSucesso('Senha alterada com sucesso.');
      setNovaSenha('');
      setConfirmarSenha('');
      setSecaoAberta(null);
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleTrocarTema(tema: TemaPreferido) {
    setColorScheme(tema);
    void salvarTemaPreferido(tema);
  }

  function handleSalvarEmail() {
    setErro(null);
    setSucesso(null);
    if (!novoEmail.trim() || !novoEmail.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    emailMutation.mutate();
  }

  function handleSalvarSenha() {
    setErro(null);
    setSucesso(null);
    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    senhaMutation.mutate();
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <Secao titulo="Tema">
        <View className="flex-row flex-wrap gap-2">
          {OPCOES_TEMA.map((opcao) => {
            // `colorScheme` reflete o efetivo (claro/escuro depois de
            // resolver "sistema"), não a preferência salva — então não dá
            // pra marcar "Sistema" como selecionado só comparando com
            // `colorScheme`. Como isso é só feedback visual do botão
            // (não é a fonte de verdade), comparar com `carregarTemaPreferido`
            // exigiria estado próprio; simplificamos: os três botões ficam
            // sempre clicáveis, sem estado "selecionado" fixo.
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => handleTrocarTema(opcao.valor)}
                accessibilityRole="button"
                className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-slate-200 px-4 dark:border-slate-700"
              >
                <Ionicons name={opcao.icone} size={16} color="#4F46E5" />
                <Text className="text-sm text-slate-900 dark:text-slate-100">{opcao.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          Tema atual: {colorScheme === 'dark' ? 'escuro' : 'claro'}
        </Text>
      </Secao>

      <Secao titulo="Privacidade">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Ionicons
              name={profile?.publico ? 'globe-outline' : 'lock-closed-outline'}
              size={20}
              color="#4F46E5"
            />
            <View className="flex-1">
              <Text className="text-base text-slate-900 dark:text-slate-100">
                Conta {profile?.publico ? 'pública' : 'privada'}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {profile?.publico
                  ? 'Qualquer pessoa pode ver seu perfil e te seguir.'
                  : 'Só quem você aprovar pode ver seu perfil.'}
              </Text>
            </View>
          </View>
          <Button
            label={profile?.publico ? 'Tornar privada' : 'Tornar pública'}
            variant="secondary"
            onPress={() => privacidadeMutation.mutate(!profile?.publico)}
            loading={privacidadeMutation.isPending}
          />
        </View>
      </Secao>

      <Secao titulo="Conta">
        <CartaoAcaoExpansivel
          icone="mail-outline"
          rotulo="Alterar e-mail"
          aberto={secaoAberta === 'email'}
          onAbrir={() => {
            setSecaoAberta('email');
            setErro(null);
          }}
          onFechar={() => setSecaoAberta(null)}
        >
          <TextField
            label="Novo e-mail"
            icon="mail-outline"
            value={novoEmail}
            onChangeText={setNovoEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={secaoAberta === 'email' ? (erro ?? undefined) : undefined}
          />
          <Button
            label="Enviar confirmação"
            icon="paper-plane-outline"
            onPress={handleSalvarEmail}
            loading={emailMutation.isPending}
          />
        </CartaoAcaoExpansivel>

        <CartaoAcaoExpansivel
          icone="lock-closed-outline"
          rotulo="Alterar senha"
          aberto={secaoAberta === 'senha'}
          onAbrir={() => {
            setSecaoAberta('senha');
            setErro(null);
          }}
          onFechar={() => setSecaoAberta(null)}
        >
          <TextField
            label="Nova senha"
            icon="lock-closed-outline"
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextField
            label="Confirmar nova senha"
            icon="lock-closed-outline"
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            secureTextEntry
            autoCapitalize="none"
            error={secaoAberta === 'senha' ? (erro ?? undefined) : undefined}
          />
          <Button
            label="Salvar nova senha"
            icon="checkmark"
            onPress={handleSalvarSenha}
            loading={senhaMutation.isPending}
          />
        </CartaoAcaoExpansivel>
      </Secao>

      {sucesso ? (
        <View className="flex-row items-center gap-1.5 rounded-2xl bg-success/10 p-3 dark:bg-success-dark/10">
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text className="flex-1 text-sm text-success dark:text-success-dark">{sucesso}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
