import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { listarSeguidores, listarSeguindo } from '@/features/social/api';
import type { PerfilResumo } from '@/features/social/types';

/** Lista de seguidores ou seguindo (`tipo` na query string decide
 * qual) de qualquer perfil — RLS de `seguidores` é aberta (mesma régua
 * do perfil público), então isso funciona pro próprio perfil e pro de
 * qualquer outro usuário. */
export default function Conexoes() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo: 'seguidores' | 'seguindo' }>();
  const { profile } = useAuth();
  const ehSeguidores = tipo !== 'seguindo';

  const query = useQuery({
    queryKey: ['conexoes', id, tipo],
    queryFn: () => (ehSeguidores ? listarSeguidores(id) : listarSeguindo(id)),
  });

  function abrirPerfil(pessoa: PerfilResumo) {
    if (pessoa.id === profile?.id) {
      router.push('/perfil');
    } else {
      router.push(`/perfil/${pessoa.id}`);
    }
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <Stack.Screen options={{ title: ehSeguidores ? 'Seguidores' : 'Seguindo' }} />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <EmptyState titulo="Não deu pra carregar" onTentarNovo={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon="people-outline"
          titulo={ehSeguidores ? 'Ninguém segue esse perfil ainda' : 'Não segue ninguém ainda'}
        />
      ) : (
        <View className="gap-1 px-4 py-3">
          {(query.data ?? []).map((pessoa) => (
            <Pressable
              key={pessoa.id}
              onPress={() => abrirPerfil(pessoa)}
              accessibilityRole="button"
              accessibilityLabel={pessoa.nome}
              className="min-h-11 flex-row items-center gap-3 rounded-lg px-2 py-2"
            >
              <FotoPerfil caminho={pessoa.foto_url} nome={pessoa.nome} tamanho={44} />
              <View className="flex-1">
                <Text className="text-base font-medium text-slate-100">{pessoa.nome}</Text>
                {pessoa.nome_usuario ? (
                  <Text className="text-xs text-slate-400">@{pessoa.nome_usuario}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
