import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
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

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

export default function Perfil() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

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
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 dark:bg-primary-dark">
          <Text className="text-3xl font-bold text-white">{iniciais(profile?.nome ?? '...')}</Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {profile?.nome ?? '...'}
          </Text>
          {profile ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 dark:bg-primary-dark/10">
              <Ionicons name={ICONE_PAPEL[profile.papel]} size={14} color="#4F46E5" />
              <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
                {ROTULO_PAPEL[profile.papel]}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

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
