import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EntradaAnimada } from '@/components/ui/EntradaAnimada';

import { BotaoDenunciar } from './BotaoDenunciar';
import { ImagemPost } from './ImagemPost';
import { ICONE_TIPO_POST, ROTULO_TIPO_POST } from './types';
import type { PostComContadores } from './api';

export function formatarData(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatarDataEvento(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`));
}

/** Card de post — reusado no feed da turma e em "Minhas publicações" no
 * perfil (mesmo formato de dado, `PostComContadores`, só a query que
 * busca muda: por turma ou por autor). */
export function CartaoPost({
  post,
  curtido,
  index,
  onCurtir,
  onDescurtir,
}: {
  post: PostComContadores;
  curtido: boolean;
  index: number;
  onCurtir: () => void;
  onDescurtir: () => void;
}) {
  const totalCurtidas = post.post_curtidas[0]?.count ?? 0;
  const totalComentarios = post.post_comentarios[0]?.count ?? 0;

  return (
    <EntradaAnimada
      index={index}
      className="gap-2 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="person" size={18} color="#4F46E5" />
        </View>
        <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {post.profiles?.nome ?? 'Alguém da turma'}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(post.criado_em)}
        </Text>
      </View>

      {post.tipo !== 'texto' ? (
        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-accent/10 px-3 py-1 dark:bg-accent-dark/10">
          <Ionicons name={ICONE_TIPO_POST[post.tipo]} size={14} color="#F59E0B" />
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
            {ROTULO_TIPO_POST[post.tipo]}
            {post.tipo === 'evento' && post.data_evento
              ? ` · ${formatarDataEvento(post.data_evento)}`
              : ''}
          </Text>
        </View>
      ) : null}

      {post.conteudo ? (
        <Text className="text-base text-slate-900 dark:text-slate-100">{post.conteudo}</Text>
      ) : null}

      {post.tipo === 'foto' && post.midia_url ? <ImagemPost caminho={post.midia_url} /> : null}

      <View className="flex-row items-center gap-1 pt-1">
        <Pressable
          onPress={curtido ? onDescurtir : onCurtir}
          accessibilityRole="button"
          accessibilityLabel={curtido ? 'Descurtir' : 'Curtir'}
          className="min-h-11 flex-row items-center gap-1 rounded-full px-3 py-2 active:bg-primary/5"
        >
          <Ionicons
            name={curtido ? 'heart' : 'heart-outline'}
            size={18}
            color={curtido ? '#4F46E5' : '#94A3B8'}
          />
          <Text
            className={
              curtido ? 'text-primary dark:text-primary-dark' : 'text-slate-600 dark:text-slate-400'
            }
          >
            {totalCurtidas}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/post/${post.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Ver comentários"
          className="min-h-11 flex-row items-center gap-1 rounded-full px-3 py-2 active:bg-primary/5"
        >
          <Ionicons name="chatbubble-outline" size={17} color="#94A3B8" />
          <Text className="text-slate-600 dark:text-slate-400">{totalComentarios}</Text>
        </Pressable>
        <View className="flex-1" />
        <BotaoDenunciar tipoConteudo="post" conteudoId={post.id} />
      </View>
    </EntradaAnimada>
  );
}
