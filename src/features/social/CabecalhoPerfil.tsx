import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FotoPerfil } from '@/features/perfil/FotoPerfil';

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

function Contador({
  numero,
  label,
  onPress,
}: {
  numero: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${numero} ${label}`}
      className="min-w-16 items-center gap-0.5 px-2 py-1"
    >
      <Text className="text-lg font-bold text-slate-100">{numero}</Text>
      <Text className="text-xs text-slate-400">{label}</Text>
    </Pressable>
  );
}

/**
 * Cabeçalho de perfil estilo Instagram, reusado no próprio perfil
 * (`(tabs)/perfil.tsx`) e no perfil público de outro usuário
 * (`perfil/[id].tsx`) — foto, nome/@handle, papel, bio, e a linha de
 * contadores (Publicações/Seguidores/Seguindo), os dois últimos
 * clicáveis levando pra `conexoes/[id]`.
 */
export function CabecalhoPerfil({
  perfilId,
  nome,
  nomeUsuario,
  fotoUrl,
  bio,
  papel,
  contadorPosts,
  contadorSeguidores,
  contadorSeguindo,
  acoes,
}: {
  perfilId: string;
  nome: string;
  nomeUsuario: string | null;
  fotoUrl: string | null;
  bio: string | null;
  papel?: keyof typeof ROTULO_PAPEL;
  contadorPosts: number;
  contadorSeguidores: number;
  contadorSeguindo: number;
  acoes?: ReactNode;
}) {
  return (
    <View className="items-center gap-3">
      <FotoPerfil caminho={fotoUrl} nome={nome} tamanho={96} />
      <View className="items-center gap-1">
        <Text className="text-2xl font-bold text-slate-100">{nome}</Text>
        {nomeUsuario ? <Text className="text-sm text-slate-400">@{nomeUsuario}</Text> : null}
        {papel ? (
          <View className="mt-1 flex-row items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 dark:bg-primary-dark/10">
            <Ionicons name={ICONE_PAPEL[papel]} size={14} color="#8B5CF6" />
            <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
              {ROTULO_PAPEL[papel]}
            </Text>
          </View>
        ) : null}
        {bio ? <Text className="mt-2 text-center text-sm text-slate-400">{bio}</Text> : null}
      </View>

      <View className="flex-row items-center justify-center">
        <Contador numero={contadorPosts} label="Publicações" />
        <Contador
          numero={contadorSeguidores}
          label="Seguidores"
          onPress={() =>
            router.push({
              pathname: '/conexoes/[id]',
              params: { id: perfilId, tipo: 'seguidores' },
            })
          }
        />
        <Contador
          numero={contadorSeguindo}
          label="Seguindo"
          onPress={() =>
            router.push({ pathname: '/conexoes/[id]', params: { id: perfilId, tipo: 'seguindo' } })
          }
        />
      </View>

      {acoes}
    </View>
  );
}
