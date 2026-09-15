import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, ScrollView, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { buscarApresentacao } from '@/features/apresentacoes/api';

const LARGURA_TELA = Dimensions.get('window').width;

function CartaoSlide({
  titulo,
  topicos,
  imagemUrl,
}: {
  titulo: string;
  topicos: string[];
  imagemUrl: string | null;
}) {
  return (
    <View style={{ width: LARGURA_TELA }} className="flex-1 items-center justify-center p-4">
      <View className="w-full max-w-md gap-4 rounded-lg border border-slate-200 bg-surface p-5 dark:bg-surface-dark">
        {imagemUrl ? (
          <Image
            source={{ uri: imagemUrl }}
            className="h-48 w-full rounded-xl"
            resizeMode="cover"
            accessibilityLabel={`Ilustração do slide: ${titulo}`}
          />
        ) : (
          <View className="h-48 w-full items-center justify-center rounded-xl bg-slate-100">
            <Ionicons name="image-outline" size={32} color="#969696" />
          </View>
        )}
        <Text className="text-lg font-bold text-slate-900">{titulo}</Text>
        <View className="gap-2">
          {topicos.map((topicoItem, indice) => (
            <View key={indice} className="flex-row items-start gap-2">
              <Text className="text-sm text-primary dark:text-primary-dark">•</Text>
              <Text className="flex-1 text-sm text-slate-700">{topicoItem}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ApresentacaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [paginaAtual, setPaginaAtual] = useState(0);

  const query = useQuery({
    queryKey: ['apresentacao', id],
    queryFn: () => buscarApresentacao(id),
    enabled: !!id,
  });

  function handleScroll(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    const pagina = Math.round(evento.nativeEvent.contentOffset.x / LARGURA_TELA);
    setPaginaAtual(pagina);
  }

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return (
      <EmptyState titulo="Não deu pra carregar a apresentação" onTentarNovo={() => query.refetch()} />
    );
  }

  const { slides } = query.data;

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <CartaoSlide
            key={slide.ordem}
            titulo={slide.titulo}
            topicos={slide.topicos}
            imagemUrl={slide.imagemUrl}
          />
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-center gap-1.5 pb-6 pt-2">
        {slides.map((slide) => (
          <View
            key={slide.ordem}
            className={`h-1.5 rounded-full ${
              slide.ordem === paginaAtual
                ? 'w-4 bg-primary dark:bg-primary-dark'
                : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
