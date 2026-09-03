import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import { useAuth } from '@/features/auth/AuthProvider';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';

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

/** Toque duplo na imagem curte, estilo Instagram — um coraçãozinho
 * aparece no centro e some sozinho. Detecção simples por timestamp
 * (sem lib extra): dois toques a menos de 300ms viram um "duplo".
 * Desligado quando o sistema pede "reduzir movimento" (a curtida ainda
 * funciona, só sem o pop do coração). */
function ImagemComToqueDuplo({
  caminho,
  curtido,
  onCurtir,
}: {
  caminho: string;
  curtido: boolean;
  onCurtir: () => void;
}) {
  const ultimoToque = useRef(0);
  const escala = useSharedValue(0);
  const opacidade = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const estiloCoracao = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
    opacity: opacidade.value,
  }));

  function handleToque() {
    const agora = Date.now();
    if (agora - ultimoToque.current < 300) {
      if (!curtido) onCurtir();
      if (!reduceMotion) {
        // eslint-disable-next-line react-hooks/immutability -- SharedValue do Reanimated, não estado do React (ver Button.tsx)
        opacidade.value = withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 400 }),
        );
        // eslint-disable-next-line react-hooks/immutability
        escala.value = withSequence(
          withTiming(1.15, { duration: 150 }),
          withTiming(1, { duration: 100 }),
        );
      }
    }
    ultimoToque.current = agora;
  }

  return (
    <Pressable
      onPress={handleToque}
      accessibilityRole="imagebutton"
      accessibilityLabel="Imagem do post — toque duas vezes pra curtir"
    >
      <ImagemPost caminho={caminho} />
      <Animated.View
        pointerEvents="none"
        style={estiloCoracao}
        className="absolute inset-0 items-center justify-center"
      >
        <Ionicons name="heart" size={96} color="#FFFFFF" style={{ opacity: 0.9 }} />
      </Animated.View>
    </Pressable>
  );
}

/** Card de post — reusado no feed da turma e em "Minhas publicações" no
 * perfil (mesmo formato de dado, `PostComContadores`, só a query que
 * busca muda: por turma ou por autor). Redesenho Fase 11: avatar de
 * verdade (clicável, leva pro perfil do autor — Fase 10), imagem
 * "edge-to-edge" dentro do card, e toque duplo pra curtir. */
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
  const { profile } = useAuth();
  const totalCurtidas = post.post_curtidas[0]?.count ?? 0;
  const totalComentarios = post.post_comentarios[0]?.count ?? 0;
  const autorId = post.profiles?.id;

  function irParaPerfilDoAutor() {
    if (!autorId) return;
    if (autorId === profile?.id) {
      router.push('/perfil');
    } else {
      router.push(`/perfil/${autorId}`);
    }
  }

  return (
    <EntradaAnimada
      index={index}
      className="gap-2 overflow-hidden rounded-3xl border border-slate-100 bg-surface pb-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark"
    >
      <Pressable
        onPress={irParaPerfilDoAutor}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${post.profiles?.nome ?? 'Alguém da turma'}`}
        className="flex-row items-center gap-2 px-4 pt-4"
      >
        <FotoPerfil
          caminho={post.profiles?.foto_url ?? null}
          nome={post.profiles?.nome ?? '?'}
          tamanho={36}
        />
        <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {post.profiles?.nome ?? 'Alguém da turma'}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(post.criado_em)}
        </Text>
      </Pressable>

      {post.tipo !== 'texto' ? (
        <View className="mx-4 flex-row items-center gap-1.5 self-start rounded-full bg-accent/10 px-3 py-1 dark:bg-accent-dark/10">
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
        <Text className="px-4 text-base text-slate-900 dark:text-slate-100">{post.conteudo}</Text>
      ) : null}

      {post.tipo === 'foto' && post.midia_url ? (
        <ImagemComToqueDuplo caminho={post.midia_url} curtido={curtido} onCurtir={onCurtir} />
      ) : null}

      <View className="flex-row items-center gap-1 px-4 pt-1">
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
