import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { buscarTurmaComEscola } from '@/features/perfil/api';

const ROTULO_PAPEL = {
  aluno: 'Aluno',
  professor: 'Professor',
  coordenacao: 'Coordenação',
} as const;

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
    <View className="flex-1 gap-4 bg-background px-6 pt-20 dark:bg-background-dark">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
          Olá, {profile?.nome ?? '...'}!
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {profile ? ROTULO_PAPEL[profile.papel] : ''}
        </Text>
        {turmaQuery.data ? (
          <Text className="text-base text-slate-600 dark:text-slate-400">
            {turmaQuery.data.escolas?.nome} · {turmaQuery.data.serie_ano} · {turmaQuery.data.nome}
          </Text>
        ) : null}
      </View>

      <Button label="Sair" variant="secondary" onPress={handleSair} loading={mutation.isPending} />
    </View>
  );
}
