import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SeloVerificado } from '@/components/ui/SeloVerificado';
import { abrirPortalAssinatura, iniciarCheckoutAssinatura } from '@/features/assinatura/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';

const BENEFICIOS = [
  {
    icone: 'infinite-outline' as const,
    titulo: 'IA de estudo sem limites',
    descricao: 'Sem teto diário de mensagens pro chat com IA — pergunta à vontade.',
  },
  {
    icone: 'checkmark-circle-outline' as const,
    titulo: 'Selo de verificado',
    descricao: 'Um selo no seu nome, visível no perfil e nos seus posts.',
  },
];

/** Abre uma URL de checkout/portal da Stripe. No web, redireciona a
 * própria aba (`window.location.href`) — `Linking.openURL` no
 * react-native-web abre em aba nova, o que some fácil atrás de um
 * bloqueador de pop-up já que a chamada só resolve depois de um
 * round-trip assíncrono (não é mais "o mesmo clique síncrono" que o
 * navegador deixa passar sem bloquear). No nativo, `Linking.openURL`
 * é o jeito certo (abre o navegador do sistema). */
function irParaStripe(url: string) {
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  Linking.openURL(url);
}

export default function Assinatura() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ sucesso?: string; cancelado?: string }>();
  const [erro, setErro] = useState<string | null>(null);
  const tentativasRestantes = useRef(0);

  const assinante = profile?.assinatura_ativa ?? false;

  // Voltando do Checkout com sucesso: o webhook da Stripe confirma a
  // assinatura de forma assíncrona (geralmente em 1-2s, mas sem
  // garantia), então uma invalidação só pode chegar cedo demais.
  // Tenta de novo por até ~10s antes de desistir — se ainda não
  // confirmou depois disso, a lista de benefícios já mostra que "assinar"
  // continua disponível, sem travar a tela esperando pra sempre.
  useEffect(() => {
    if (params.sucesso !== '1' || assinante) return;
    tentativasRestantes.current = 5;
    const intervalo = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
      tentativasRestantes.current -= 1;
      if (tentativasRestantes.current <= 0) clearInterval(intervalo);
    }, 2000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à chegada do parâmetro
  }, [params.sucesso]);

  const checkoutMutation = useMutation({
    mutationFn: iniciarCheckoutAssinatura,
    onSuccess: irParaStripe,
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  const portalMutation = useMutation({
    mutationFn: abrirPortalAssinatura,
    onSuccess: irParaStripe,
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-6 px-6 pb-16 pt-8"
    >
      <View className="items-center gap-2">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name="sparkles" size={28} color="#8B5CF6" />
        </View>
        <Text className="text-2xl font-bold text-slate-100">Turma+ Premium</Text>
        <Text className="text-center text-sm text-slate-400">
          R$1,99/mês · cancele quando quiser
        </Text>
      </View>

      {params.sucesso === '1' ? (
        <View className="flex-row items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-4 dark:border-accent-dark/30 dark:bg-accent-dark/10">
          <Ionicons name="hourglass-outline" size={18} color="#2DD4BF" />
          <Text className="flex-1 text-sm text-slate-200">
            {assinante
              ? 'Assinatura confirmada — bem-vindo ao Premium!'
              : 'Pagamento recebido — confirmando sua assinatura, só um instante...'}
          </Text>
        </View>
      ) : null}

      {params.cancelado === '1' && !assinante ? (
        <View className="rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark">
          <Text className="text-sm text-slate-400">
            Checkout cancelado — sem problema, você pode assinar quando quiser.
          </Text>
        </View>
      ) : null}

      <View className="gap-4 rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark">
        {BENEFICIOS.map((b) => (
          <View key={b.titulo} className="flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
              <Ionicons name={b.icone} size={18} color="#2DD4BF" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold text-slate-100">{b.titulo}</Text>
              <Text className="text-xs text-slate-400">{b.descricao}</Text>
            </View>
          </View>
        ))}
      </View>

      {erro ? <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text> : null}

      {assinante ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-center gap-1.5 rounded-md bg-accent/10 px-3 py-2 dark:bg-accent-dark/10">
            <SeloVerificado tamanho={16} />
            <Text className="text-sm font-semibold text-accent dark:text-accent-dark">
              Você já é assinante
            </Text>
          </View>
          {profile?.assinatura_valido_ate ? (
            <Text className="text-center text-xs text-slate-400">
              Renova em{' '}
              {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
                new Date(profile.assinatura_valido_ate),
              )}
            </Text>
          ) : null}
          <Button
            label="Gerenciar assinatura"
            icon="card-outline"
            variant="secondary"
            onPress={() => portalMutation.mutate()}
            loading={portalMutation.isPending}
          />
        </View>
      ) : (
        <Button
          label="Assinar por R$1,99/mês"
          icon="sparkles"
          onPress={() => checkoutMutation.mutate()}
          loading={checkoutMutation.isPending}
        />
      )}
    </ScrollView>
  );
}
