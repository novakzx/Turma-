import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { listarPostsDoAutor } from '@/features/feed/api';
import { buscarTurmaComEscola } from '@/features/perfil/api';
import { contarConexoes } from '@/features/social/api';
import { CabecalhoPerfil } from '@/features/social/CabecalhoPerfil';
import { GridPosts } from '@/features/social/GridPosts';
import { StoriesBar } from '@/features/social/StoriesBar';

export default function Perfil() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';

  const turmaQuery = useQuery({
    queryKey: ['turma-com-escola', profile?.turma_id],
    queryFn: () => buscarTurmaComEscola(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
  });

  const contadoresQuery = useQuery({
    queryKey: ['contadores-conexoes', profile?.id],
    queryFn: () => contarConexoes(profile!.id),
    enabled: !!profile,
  });

  const postsQuery = useQuery({
    queryKey: ['posts-do-autor', profile?.id],
    queryFn: () => listarPostsDoAutor(profile!.id),
    enabled: !!profile,
  });

  const mutation = useMutation({
    mutationFn: signOut,
    // Zera o cache pra não vazar dado de uma conta pra outra no mesmo
    // aparelho quando alguém loga com um usuário diferente em seguida.
    onSuccess: () => queryClient.clear(),
  });

  function handleSair() {
    Alert.alert('Sair da conta', 'Tem certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => mutation.mutate() },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-6 pb-28 pt-16"
    >
      <StoriesBar />

      <View className="gap-6 px-6">
        <CabecalhoPerfil
          perfilId={profile?.id ?? ''}
          nome={profile?.nome ?? '...'}
          nomeUsuario={profile?.nome_usuario ?? null}
          fotoUrl={profile?.foto_url ?? null}
          bio={profile?.bio ?? null}
          papel={profile?.papel}
          contadorPosts={postsQuery.data?.length ?? 0}
          contadorSeguidores={contadoresQuery.data?.seguidores ?? 0}
          contadorSeguindo={contadoresQuery.data?.seguindo ?? 0}
          acoes={
            <Button
              label="Editar perfil"
              icon="create-outline"
              variant="secondary"
              onPress={() => router.push('/editar-perfil')}
            />
          }
        />

        {turmaQuery.data ? (
          <View className="gap-3 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
                <Ionicons name="business-outline" size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-slate-500 dark:text-slate-400">Escola</Text>
                <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {turmaQuery.data.escolas?.nome}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
                <Ionicons name="people-outline" size={20} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-slate-500 dark:text-slate-400">Turma</Text>
                <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {turmaQuery.data.serie_ano} · {turmaQuery.data.nome}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <GridPosts posts={postsQuery.data ?? []} />

      <View className="gap-3 px-6">
        {ehStaff ? (
          <Button
            label="Gerenciar matérias"
            icon="library-outline"
            variant="secondary"
            onPress={() => router.push('/gerenciar-materias')}
          />
        ) : null}

        {ehStaff ? (
          <Button
            label="Denúncias"
            icon="flag-outline"
            variant="secondary"
            onPress={() => router.push('/moderacao-denuncias')}
          />
        ) : null}

        <Button
          label="Minhas publicações"
          icon="newspaper-outline"
          variant="secondary"
          onPress={() => router.push('/minhas-publicacoes')}
        />

        <Button
          label="Pedidos de entrada"
          icon="mail-open-outline"
          variant="secondary"
          onPress={() => router.push('/pedidos-turma')}
        />

        <Button
          label="Configurações"
          icon="settings-outline"
          variant="secondary"
          onPress={() => router.push('/configuracoes')}
        />

        <Button
          label="Sair da conta"
          icon="log-out-outline"
          variant="secondary"
          onPress={handleSair}
          loading={mutation.isPending}
        />
      </View>
    </ScrollView>
  );
}
