import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { buscarTurmaComEscola } from '@/features/perfil/api';

const ROTULO_PAPEL = {
  aluno: 'Aluno',
  professor: 'Professor',
  coordenacao: 'Coordenação',
} as const;

const ICONE_PAPEL = {
  aluno: 'school-outline',
  professor: 'briefcase-outline',
  coordenacao: 'shield-checkmark-outline',
} as const;

export default function Perfil() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const ehStaff = profile?.papel === 'professor' || profile?.papel === 'coordenacao';

  const turmaQuery = useQuery({
    queryKey: ['turma-com-escola', profile?.turma_id],
    queryFn: () => buscarTurmaComEscola(profile?.turma_id as string),
    enabled: !!profile?.turma_id,
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
      contentContainerClassName="gap-6 px-6 pb-28 pt-20"
    >
      <View className="items-center gap-3">
        <FotoPerfil
          caminho={profile?.foto_url ?? null}
          nome={profile?.nome ?? '...'}
          tamanho={96}
        />
        <View className="items-center gap-1">
          <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {profile?.nome ?? '...'}
          </Text>
          {profile?.nome_usuario ? (
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              @{profile.nome_usuario}
            </Text>
          ) : null}
          {profile ? (
            <View className="mt-1 flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 dark:bg-primary-dark/10">
              <Ionicons name={ICONE_PAPEL[profile.papel]} size={14} color="#4F46E5" />
              <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
                {ROTULO_PAPEL[profile.papel]}
              </Text>
            </View>
          ) : null}
          {profile?.bio ? (
            <Text className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        label="Editar perfil"
        icon="create-outline"
        variant="secondary"
        onPress={() => router.push('/editar-perfil')}
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

      {ehStaff ? (
        <Button
          label="Gerenciar matérias"
          icon="library-outline"
          variant="secondary"
          onPress={() => router.push('/gerenciar-materias')}
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
    </ScrollView>
  );
}
