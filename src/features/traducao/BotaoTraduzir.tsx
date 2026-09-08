import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  carregarIdiomaTraducaoPreferido,
  salvarIdiomaTraducaoPreferido,
  IDIOMAS_TRADUCAO,
  type IdiomaTraducao,
} from '@/features/configuracoes/idioma';

import { traduzirTexto } from './api';

/**
 * Botão "Traduzir" (pedido do usuário — útil pra aluno de intercâmbio/
 * imigrante lendo o feed). Sem tela de configuração própria de propósito
 * ("comece simples") — o idioma escolhido fica guardado no aparelho
 * (`salvarIdiomaTraducaoPreferido`) pra não perguntar de novo toda vez.
 */
export function BotaoTraduzir({ texto }: { texto: string }) {
  const [idioma, setIdioma] = useState<IdiomaTraducao | null>(null);
  const [escolhendoIdioma, setEscolhendoIdioma] = useState(false);
  const [traducao, setTraducao] = useState<string | null>(null);

  useEffect(() => {
    carregarIdiomaTraducaoPreferido().then(setIdioma);
  }, []);

  const traduzirMutation = useMutation({
    mutationFn: (idiomaEscolhido: IdiomaTraducao) => traduzirTexto(texto, idiomaEscolhido),
    onSuccess: (resultado, idiomaEscolhido) => {
      setTraducao(resultado);
      setEscolhendoIdioma(false);
      salvarIdiomaTraducaoPreferido(idiomaEscolhido);
    },
  });

  function handleEscolherIdioma(idiomaEscolhido: IdiomaTraducao) {
    setIdioma(idiomaEscolhido);
    traduzirMutation.mutate(idiomaEscolhido);
  }

  if (traducao) {
    return (
      <View className="gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 dark:border-primary-dark/20 dark:bg-primary-dark/10">
        <Text className="text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-dark">
          Tradução ({idioma})
        </Text>
        <Text className="text-sm text-slate-200">{traducao}</Text>
        <Pressable onPress={() => setTraducao(null)} accessibilityRole="button">
          <Text className="text-xs font-semibold text-slate-400">Ver original</Text>
        </Pressable>
      </View>
    );
  }

  if (escolhendoIdioma) {
    return (
      <View className="flex-row flex-wrap gap-1.5">
        {IDIOMAS_TRADUCAO.map((opcao) => (
          <Pressable
            key={opcao}
            onPress={() => handleEscolherIdioma(opcao)}
            disabled={traduzirMutation.isPending}
            accessibilityRole="button"
            className="min-h-11 items-center justify-center rounded-md border border-slate-700 px-3"
          >
            <Text className="text-xs text-slate-100">{opcao}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => (idioma ? handleEscolherIdioma(idioma) : setEscolhendoIdioma(true))}
      onLongPress={() => setEscolhendoIdioma(true)}
      disabled={traduzirMutation.isPending}
      accessibilityRole="button"
      accessibilityLabel="Traduzir — toque e segure pra escolher o idioma"
      className="min-h-11 flex-row items-center gap-1 self-start rounded-md border border-slate-700 px-3"
    >
      <Ionicons name="language-outline" size={14} color="#8B5CF6" />
      <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
        {traduzirMutation.isPending ? 'Traduzindo...' : `Traduzir${idioma ? ` (${idioma})` : ''}`}
      </Text>
    </Pressable>
  );
}
