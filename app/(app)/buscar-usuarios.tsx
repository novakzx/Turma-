import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { buscarUsuarios } from '@/features/busca/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

/** Pesquisar usuário por nome ou @usuário (brief seção 9, decisão do
 * usuário: global, todas as escolas). Página nova, mas a régua de quem
 * aparece já existe desde a Fase 10 (RLS de `profiles`) — essa tela só
 * dá uma forma de descobrir gente, não abre visibilidade nova nenhuma. */
export default function BuscarUsuarios() {
  const { profile } = useAuth();
  const [termo, setTermo] = useState('');

  const buscaQuery = useQuery({
    queryKey: ['busca-usuarios', termo],
    queryFn: () => buscarUsuarios(termo, profile!.id),
    enabled: !!profile && termo.trim().length >= 2,
  });

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 px-6 pb-10 pt-6"
    >
      <Text className="text-2xl font-bold text-primary dark:text-primary-dark">Pesquisar</Text>

      <TextField
        label="Nome ou @usuário"
        icon="search-outline"
        value={termo}
        onChangeText={setTermo}
        placeholder="Digite pra buscar..."
        autoCapitalize="none"
        autoCorrect={false}
      />

      {termo.trim().length > 0 && termo.trim().length < 2 ? (
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          Digite pelo menos 2 letras.
        </Text>
      ) : buscaQuery.isLoading ? (
        <LoadingState />
      ) : termo.trim().length >= 2 && (buscaQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="person-outline"
          titulo="Ninguém encontrado"
          descricao="Tenta buscar por outro nome ou @usuário."
        />
      ) : (
        <View className="gap-2">
          {(buscaQuery.data ?? []).map((pessoa) => (
            <Pressable
              key={pessoa.id}
              onPress={() => router.push(`/perfil/${pessoa.id}`)}
              accessibilityRole="button"
              accessibilityLabel={pessoa.nome}
              className="min-h-11 flex-row items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <FotoPerfil caminho={pessoa.foto_url} nome={pessoa.nome} tamanho={44} />
              <View className="flex-1">
                <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {pessoa.nome}
                </Text>
                {pessoa.nome_usuario ? (
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    @{pessoa.nome_usuario}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
