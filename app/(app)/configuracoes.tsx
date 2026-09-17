import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { atualizarSenha, signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { useTema } from '@/features/configuracoes/TemaProvider';
import type { TemaPreferido } from '@/features/configuracoes/tema';
import { desbloquearUsuario, listarBloqueios } from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { atualizarPrivacidade } from '@/features/perfil/api';
import { excluirMinhaConta, exportarMeusDados } from '@/features/perfil/dadosPessoais';
import { CATALOGO_CORES_DESTAQUE, type CorDestaqueId } from '@/lib/temaCores';

const OPCOES_TEMA: {
  valor: TemaPreferido;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  { valor: 'light', rotulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'dark', rotulo: 'Escuro', icone: 'moon-outline' },
  { valor: 'system', rotulo: 'Sistema', icone: 'phone-portrait-outline' },
];

/** `window.confirm` no web, `Alert.alert` nativo — mesmo padrão já usado
 * em `perfil.tsx`/`gerenciar-materias.tsx` (`Alert.alert` não tem UI no
 * navegador). Aqui a mensagem é fixa (sempre a mesma pergunta séria de
 * "apagar conta"), por isso não recebe parâmetro de texto como as outras. */
function confirmarExclusaoConta(aoConfirmar: () => void) {
  const mensagem =
    'Isso apaga sua conta e todo o seu histórico (posts, mensagens, notas, flashcards) ' +
    'PERMANENTEMENTE. Não tem como desfazer. Tem certeza?';
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Apagar conta', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar tudo', style: 'destructive', onPress: aoConfirmar },
  ]);
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:bg-surface-dark">
      <Text className="text-sm font-semibold text-slate-700">{titulo}</Text>
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
        className="min-h-11 flex-row items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
      >
        <Ionicons name={icone} size={18} color="#0095F6" />
        <Text className="flex-1 text-base text-slate-900">{rotulo}</Text>
        <Ionicons name="chevron-forward" size={18} color="#969696" />
      </Pressable>
    );
  }

  return (
    <View className="gap-2 rounded-lg border border-primary/30 p-3 dark:border-primary-dark/30">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700">{rotulo}</Text>
        <Pressable onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={18} color="#969696" />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/** Uma linha de "Contas bloqueadas" — avatar, nome, botão de
 * desbloquear. Mesmo padrão visual dos outros botões desta tela
 * (`variant="secondary"`), só num card mais compacto pra caber vários
 * numa lista. */
function CartaoContaBloqueada({
  perfil,
  onDesbloquear,
  carregando,
}: {
  perfil: { id: string; nome: string; nome_usuario: string | null; foto_url: string | null };
  onDesbloquear: () => void;
  carregando: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-slate-200 p-3">
      <FotoPerfil caminho={perfil.foto_url} nome={perfil.nome} tamanho={40} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900">{perfil.nome}</Text>
        {perfil.nome_usuario ? (
          <Text className="text-xs text-slate-500">@{perfil.nome_usuario}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={onDesbloquear}
        disabled={carregando}
        accessibilityRole="button"
        accessibilityLabel={`Desbloquear ${perfil.nome}`}
        className="min-h-11 items-center justify-center rounded-md border border-slate-200 px-3"
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#0095F6" />
        ) : (
          <Text className="text-sm font-medium text-primary dark:text-primary-dark">
            Desbloquear
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function Configuracoes() {
  const { profile } = useAuth();
  const assinante = profile?.assinatura_ativa ?? false;
  const queryClient = useQueryClient();
  const { temaPreferido, setTemaPreferido, cores, corDestaqueId, setCorDestaque, escuro } =
    useTema();

  const bloqueiosQuery = useQuery({
    queryKey: ['bloqueios', profile?.id],
    queryFn: () => listarBloqueios(profile!.id),
    enabled: !!profile,
  });
  const desbloquearMutation = useMutation({
    mutationFn: (bloqueadoId: string) => desbloquearUsuario(profile!.id, bloqueadoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bloqueios', profile?.id] }),
  });

  const [secaoAberta, setSecaoAberta] = useState<'senha' | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const privacidadeMutation = useMutation({
    mutationFn: (publico: boolean) => atualizarPrivacidade(profile!.id, publico),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] }),
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

  const exportarMutation = useMutation({
    mutationFn: () => exportarMeusDados(profile!.id),
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const excluirContaMutation = useMutation({
    mutationFn: excluirMinhaConta,
    onSuccess: async () => {
      // A conta já foi apagada no servidor (auth.users + cascade) — a
      // sessão local ainda existe até isto rodar; `signOut` limpa o token
      // guardado e o `queryClient.clear()` evita qualquer resquício de
      // dado da conta apagada aparecer se alguém logar de novo neste
      // mesmo aparelho em seguida.
      await signOut();
      queryClient.clear();
      router.replace('/');
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

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
            const selecionada = temaPreferido === opcao.valor;
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => setTemaPreferido(opcao.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionada }}
                className={`min-h-11 flex-row items-center gap-1.5 rounded-md border px-4 ${
                  selecionada ? 'border-primary bg-primary/10' : 'border-slate-200'
                }`}
              >
                <Ionicons
                  name={opcao.icone}
                  size={16}
                  color={selecionada ? cores.primary : cores.mutado}
                />
                <Text
                  className={`text-sm ${selecionada ? 'font-semibold text-primary' : 'text-slate-900'}`}
                >
                  {opcao.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Secao>

      <Secao titulo="Temas exclusivos">
        {!assinante ? (
          <Pressable
            onPress={() => router.push('/assinatura')}
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-md bg-accent/10 px-3 py-2 dark:bg-accent-dark/10"
          >
            <Ionicons name="sparkles" size={14} color={cores.primary} />
            <Text className="flex-1 text-xs text-accent dark:text-accent-dark">
              Cores de destaque exclusivas são um recurso do Turma+ Premium.
            </Text>
          </Pressable>
        ) : null}
        <View className="flex-row flex-wrap gap-3">
          {(Object.keys(CATALOGO_CORES_DESTAQUE) as CorDestaqueId[]).map((id) => {
            const cor = CATALOGO_CORES_DESTAQUE[id];
            const corResolvida = escuro ? cor.escuro : cor.claro;
            const selecionada = corDestaqueId === id;
            // "azul" (padrão) sempre liberado, mesmo sem assinatura — só
            // as cores de verdade exclusivas exigem Premium.
            const trancada = id !== 'azul' && !assinante;
            return (
              <Pressable
                key={id}
                onPress={() =>
                  trancada ? router.push('/assinatura') : setCorDestaque(id)
                }
                accessibilityRole="button"
                accessibilityLabel={trancada ? `${cor.nome} (recurso Premium)` : cor.nome}
                accessibilityState={{ selected: selecionada }}
                className="items-center gap-1"
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: corResolvida }}
                >
                  {trancada ? (
                    <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                  ) : selecionada ? (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text className="text-xs text-slate-700">{cor.nome.replace(' (padrão)', '')}</Text>
              </Pressable>
            );
          })}
        </View>
      </Secao>

      <Secao titulo="Privacidade">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Ionicons
              name={profile?.publico ? 'globe-outline' : 'lock-closed-outline'}
              size={20}
              color="#0095F6"
            />
            <View className="flex-1">
              <Text className="text-base text-slate-900">
                Conta {profile?.publico ? 'pública' : 'privada'}
              </Text>
              <Text className="text-xs text-slate-500">
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

      <Secao titulo="Contas bloqueadas">
        {bloqueiosQuery.isLoading ? (
          <ActivityIndicator color="#0095F6" />
        ) : (bloqueiosQuery.data ?? []).length === 0 ? (
          <Text className="text-sm text-slate-500">
            Você não bloqueou ninguém. Contas bloqueadas não conseguem te mandar mensagem nem
            iniciar conversa.
          </Text>
        ) : (
          <View className="gap-2">
            {bloqueiosQuery.data!.map(({ id, perfil }) => (
              <CartaoContaBloqueada
                key={id}
                perfil={perfil}
                onDesbloquear={() => desbloquearMutation.mutate(perfil.id)}
                carregando={
                  desbloquearMutation.isPending && desbloquearMutation.variables === perfil.id
                }
              />
            ))}
          </View>
        )}
      </Secao>

      <Secao titulo="Conta">
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

      <Secao titulo="Meus dados">
        <Button
          label="Exportar meus dados"
          icon="download-outline"
          variant="secondary"
          onPress={() => exportarMutation.mutate()}
          loading={exportarMutation.isPending}
        />
        <Text className="text-xs text-slate-500">
          Baixa um arquivo com tudo que você postou, comentou e conversou na Turma+.
        </Text>
        <Button
          label="Apagar minha conta"
          icon="trash-outline"
          variant="secondary"
          onPress={() => confirmarExclusaoConta(() => excluirContaMutation.mutate())}
          loading={excluirContaMutation.isPending}
        />
        <Text className="text-xs text-slate-500">
          Apaga sua conta e todo o seu histórico permanentemente. Não tem como desfazer.
        </Text>
      </Secao>

      {sucesso ? (
        <View className="flex-row items-center gap-1.5 rounded-lg bg-success/10 p-3 dark:bg-success-dark/10">
          <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
          <Text className="flex-1 text-sm text-success dark:text-success-dark">{sucesso}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
