import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { listarPostsDoAutor } from '@/features/feed/api';
import {
  bloquearUsuario,
  criarConversaDireta,
  desbloquearUsuario,
  euBloqueei,
} from '@/features/mensagens/api';
import { CabecalhoPerfil } from '@/features/social/CabecalhoPerfil';
import { GridPosts } from '@/features/social/GridPosts';
import {
  buscarPerfilPublico,
  contarConexoes,
  deixarDeSeguir,
  estaSeguindo,
  seguir,
} from '@/features/social/api';

function confirmar(mensagem: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) aoConfirmar();
    return;
  }
  Alert.alert('Confirmar', mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Bloquear', style: 'destructive', onPress: aoConfirmar },
  ]);
}

/** Perfil de qualquer outro usuário (pedido "abrir perfil pra qualquer
 * usuário do app, de qualquer escola" — Fase 9/10). RLS de `profiles`
 * decide se essa linha existe pra quem está olhando (perfil público,
 * mesma turma/escola, staff, ou é o próprio dono); sem acesso, cai no
 * estado de erro em vez de vazar dado. */
export default function PerfilPublico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: meuPerfil } = useAuth();
  const queryClient = useQueryClient();

  const perfilQuery = useQuery({
    queryKey: ['perfil-publico', id],
    queryFn: () => buscarPerfilPublico(id),
  });

  const contadoresQuery = useQuery({
    queryKey: ['contadores-conexoes', id],
    queryFn: () => contarConexoes(id),
    enabled: !!perfilQuery.data,
  });

  const postsQuery = useQuery({
    queryKey: ['posts-do-autor', id],
    queryFn: () => listarPostsDoAutor(id),
    enabled: !!perfilQuery.data,
  });

  const seguindoQuery = useQuery({
    queryKey: ['estou-seguindo', meuPerfil?.id, id],
    queryFn: () => estaSeguindo(meuPerfil!.id, id),
    enabled: !!meuPerfil && meuPerfil.id !== id,
  });

  const seguirMutation = useMutation({
    mutationFn: () => seguir(meuPerfil!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estou-seguindo', meuPerfil?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['contadores-conexoes', id] });
    },
  });

  const deixarDeSeguirMutation = useMutation({
    mutationFn: () => deixarDeSeguir(meuPerfil!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estou-seguindo', meuPerfil?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['contadores-conexoes', id] });
    },
  });

  const bloqueadoQuery = useQuery({
    queryKey: ['eu-bloqueei', meuPerfil?.id, id],
    queryFn: () => euBloqueei(meuPerfil!.id, id),
    enabled: !!meuPerfil && meuPerfil.id !== id,
  });

  const bloquearMutation = useMutation({
    mutationFn: () => bloquearUsuario(meuPerfil!.id, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['eu-bloqueei', meuPerfil?.id, id] }),
  });

  const desbloquearMutation = useMutation({
    mutationFn: () => desbloquearUsuario(meuPerfil!.id, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['eu-bloqueei', meuPerfil?.id, id] }),
  });

  const mensagemMutation = useMutation({
    mutationFn: () => criarConversaDireta(id),
    onSuccess: (conversaId) => router.push(`/conversa/${conversaId}`),
  });

  // É o próprio usuário — leva pra tela de perfil de verdade (com editar,
  // configurações etc.) em vez de duplicar a tela aqui.
  if (meuPerfil && meuPerfil.id === id) {
    return <Redirect href="/perfil" />;
  }

  if (perfilQuery.isLoading) return <LoadingState />;
  if (perfilQuery.isError || !perfilQuery.data) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        titulo="Não deu pra ver esse perfil"
        descricao="Ou ele não existe, ou não está aberto pra você."
      />
    );
  }

  const perfil = perfilQuery.data;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-6 px-6 pb-16 pt-8"
    >
      <CabecalhoPerfil
        perfilId={perfil.id}
        nome={perfil.nome}
        nomeUsuario={perfil.nome_usuario}
        fotoUrl={perfil.foto_url}
        bio={perfil.bio}
        link={perfil.link}
        papel={perfil.papel}
        verificado={perfil.assinatura_ativa}
        contadorPosts={postsQuery.data?.length ?? 0}
        contadorSeguidores={contadoresQuery.data?.seguidores ?? 0}
        contadorSeguindo={contadoresQuery.data?.seguindo ?? 0}
        acoes={
          <View className="w-full gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1">
                {seguindoQuery.data ? (
                  <Button
                    label="Deixar de seguir"
                    icon="person-remove-outline"
                    variant="secondary"
                    onPress={() => deixarDeSeguirMutation.mutate()}
                    loading={deixarDeSeguirMutation.isPending}
                  />
                ) : (
                  <Button
                    label="Seguir"
                    icon="person-add-outline"
                    onPress={() => seguirMutation.mutate()}
                    loading={seguirMutation.isPending}
                  />
                )}
              </View>
              <View className="flex-1">
                <Button
                  label="Mensagem"
                  icon="chatbubble-outline"
                  variant="secondary"
                  onPress={() => mensagemMutation.mutate()}
                  loading={mensagemMutation.isPending}
                />
              </View>
            </View>
            <Button
              label={bloqueadoQuery.data ? 'Desbloquear' : 'Bloquear'}
              icon={bloqueadoQuery.data ? 'lock-open-outline' : 'ban-outline'}
              variant="secondary"
              onPress={() =>
                bloqueadoQuery.data
                  ? desbloquearMutation.mutate()
                  : confirmar(
                      `Bloquear ${perfil.nome}? Vocês não vão poder trocar mensagens.`,
                      () => bloquearMutation.mutate(),
                    )
              }
              loading={bloquearMutation.isPending || desbloquearMutation.isPending}
            />
          </View>
        }
      />

      <GridPosts posts={postsQuery.data ?? []} />
    </ScrollView>
  );
}
