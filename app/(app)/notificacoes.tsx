import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatarData } from '@/features/feed/CartaoPost';
import {
  listarCurtidasEmPosts,
  listarCurtidasEmStories,
  listarNovosSeguidores,
  listarSugestoesAmizade,
} from '@/features/notificacoes/api';
import { mesclarCurtidas } from '@/features/notificacoes/regras';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { listarSeguindo, seguir } from '@/features/social/api';
import type { PerfilResumo } from '@/features/social/types';

/** Seção com título + lista, mesmo visual das outras telas do app
 * (`configuracoes.tsx` usa cartão com borda; aqui é mais parecido com
 * o cabeçalho de lista simples do perfil/conexões). */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function LinhaPerfil({
  perfil,
  legenda,
  onPress,
  acao,
}: {
  perfil: PerfilResumo;
  legenda: string;
  onPress?: () => void;
  acao?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-slate-100 bg-surface p-3 dark:border-slate-100 dark:bg-surface-dark">
      {/* `acao` (quando presente) é outro `Pressable` — não pode ficar
          dentro deste, senão vira `<button>` dentro de `<button>` no web
          (HTML inválido, hidratação quebra — achado testando ao vivo).
          Por isso só a parte de avatar+texto é clicável, a ação fica
          fora, como irmão, não filho. */}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        className="flex-1 flex-row items-center gap-3"
      >
        <FotoPerfil
          caminho={perfil.foto_url}
          urlPreAssinada={perfil.urlFotoAssinada}
          nome={perfil.nome}
          tamanho={44}
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
            {perfil.nome}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {legenda}
          </Text>
        </View>
      </Pressable>
      {acao}
    </View>
  );
}

function BotaoSeguir({
  nome,
  jaSegue,
  onSeguir,
  carregando,
}: {
  nome: string;
  jaSegue: boolean;
  onSeguir: () => void;
  carregando: boolean;
}) {
  if (jaSegue) {
    return (
      <View className="rounded-md bg-slate-100 px-3 py-2">
        <Text className="text-xs font-medium text-slate-500">Seguindo</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onSeguir}
      disabled={carregando}
      accessibilityRole="button"
      accessibilityLabel={`Seguir ${nome}`}
      className="min-h-11 items-center justify-center rounded-md bg-primary px-3 dark:bg-primary-dark"
    >
      {carregando ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text className="text-xs font-semibold text-white">Seguir</Text>
      )}
    </Pressable>
  );
}

/** Página de notificações (pedido do usuário — antes o sino levava
 * direto pra Configurações, sem nenhuma lista de verdade). Três
 * seções: curtidas recebidas (post + story mescladas), gente que
 * começou a te seguir, e sugestões de quem seguir (colegas de turma
 * que você ainda não segue — v1 simples, ver comentário em
 * `listarSugestoesAmizade`). Sem "não lido"/badge de propósito, mesma
 * razão documentada antes em `TopHeader.tsx`: sem esse controle ainda,
 * melhor não fingir que existe. */
export default function Notificacoes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const curtidasPostsQuery = useQuery({
    queryKey: ['curtidas-recebidas-posts', profile?.id],
    queryFn: () => listarCurtidasEmPosts(profile!.id),
    enabled: !!profile,
  });
  const curtidasStoriesQuery = useQuery({
    queryKey: ['curtidas-recebidas-stories', profile?.id],
    queryFn: () => listarCurtidasEmStories(profile!.id),
    enabled: !!profile,
  });
  const seguidoresQuery = useQuery({
    queryKey: ['novos-seguidores', profile?.id],
    queryFn: () => listarNovosSeguidores(profile!.id),
    enabled: !!profile,
  });
  const sugestoesQuery = useQuery({
    queryKey: ['sugestoes-amizade', profile?.id, profile?.turma_id],
    queryFn: () => listarSugestoesAmizade(profile!.id, profile!.turma_id),
    enabled: !!profile,
  });
  // Pra saber se já sigo de volta quem apareceu em "novos seguidores"
  // (e decidir se mostra "Seguir" ou "Seguindo") — uma query só, não
  // uma por linha.
  const seguindoQuery = useQuery({
    queryKey: ['meu-seguindo-ids', profile?.id],
    queryFn: () => listarSeguindo(profile!.id),
    enabled: !!profile,
  });
  const idsQueSigo = new Set((seguindoQuery.data ?? []).map((p) => p.id));

  const seguirMutation = useMutation({
    mutationFn: (seguidoId: string) => seguir(profile!.id, seguidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meu-seguindo-ids', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['sugestoes-amizade', profile?.id] });
    },
  });

  const carregando =
    curtidasPostsQuery.isLoading ||
    curtidasStoriesQuery.isLoading ||
    seguidoresQuery.isLoading ||
    sugestoesQuery.isLoading;

  const curtidas = mesclarCurtidas(curtidasPostsQuery.data ?? [], curtidasStoriesQuery.data ?? []);
  const seguidores = seguidoresQuery.data ?? [];
  const sugestoes = sugestoesQuery.data ?? [];

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  if (curtidas.length === 0 && seguidores.length === 0 && sugestoes.length === 0) {
    return (
      <EmptyState
        icon="notifications-outline"
        titulo="Sem novidades por aqui"
        descricao="Curtidas, novos seguidores e sugestões aparecem nesta tela."
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-6 p-4 pb-10"
    >
      {curtidas.length > 0 ? (
        <Secao titulo="Curtidas">
          <View className="gap-2">
            {curtidas.map((c) => (
              <LinhaPerfil
                key={`${c.tipo}-${c.id}`}
                perfil={c.autor}
                legenda={`curtiu ${c.tipo === 'post' ? 'seu post' : 'sua story'} · ${formatarData(c.criadoEm)}`}
                onPress={() =>
                  router.push(c.tipo === 'post' ? `/post/${c.itemId}` : `/story/${c.autor.id}`)
                }
                acao={<Ionicons name="heart" size={18} color="#F87171" />}
              />
            ))}
          </View>
        </Secao>
      ) : null}

      {seguidores.length > 0 ? (
        <Secao titulo="Novos seguidores">
          <View className="gap-2">
            {seguidores.map((s) => (
              <LinhaPerfil
                key={s.id}
                perfil={s.perfil}
                legenda={`começou a seguir você · ${formatarData(s.criadoEm)}`}
                onPress={() => router.push(`/perfil/${s.perfil.id}`)}
                acao={
                  <BotaoSeguir
                    nome={s.perfil.nome}
                    jaSegue={idsQueSigo.has(s.perfil.id)}
                    onSeguir={() => seguirMutation.mutate(s.perfil.id)}
                    carregando={
                      seguirMutation.isPending && seguirMutation.variables === s.perfil.id
                    }
                  />
                }
              />
            ))}
          </View>
        </Secao>
      ) : null}

      {sugestoes.length > 0 ? (
        <Secao titulo="Sugestões pra seguir">
          <View className="gap-2">
            {sugestoes.map((p) => (
              <LinhaPerfil
                key={p.id}
                perfil={p}
                legenda={p.nome_usuario ? `@${p.nome_usuario} · sua turma` : 'sua turma'}
                onPress={() => router.push(`/perfil/${p.id}`)}
                acao={
                  <BotaoSeguir
                    nome={p.nome}
                    jaSegue={idsQueSigo.has(p.id)}
                    onSeguir={() => seguirMutation.mutate(p.id)}
                    carregando={seguirMutation.isPending && seguirMutation.variables === p.id}
                  />
                }
              />
            ))}
          </View>
        </Secao>
      ) : null}
    </ScrollView>
  );
}
