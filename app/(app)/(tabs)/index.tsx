import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import { useAuth } from '@/features/auth/AuthProvider';
import { exportarIcs } from '@/features/calendario/exportar';
import {
  ANO_LETIVO,
  diasAte,
  listarOrdenados,
  proximoEvento,
} from '@/features/calendario/feriados';
import { gerarIcs, mesclarEventos, type EventoCalendario } from '@/features/calendario/regras';
import { listarTodasAvaliacoesComData } from '@/features/notas/api';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatarPeriodo(item: EventoCalendario): string {
  if (item.fim) {
    return `${FORMATO_DATA.format(new Date(item.data))} – ${FORMATO_DATA.format(new Date(item.fim))}`;
  }
  return FORMATO_DATA.format(new Date(item.data));
}

const ROTULO_TIPO: Record<EventoCalendario['tipo'], string> = {
  nacional: 'Feriado nacional',
  letivo: 'Interrupção letiva',
  avaliacao: 'Avaliação',
};

const COR_TIPO: Record<EventoCalendario['tipo'], string> = {
  nacional: '#8B5CF6',
  letivo: '#2DD4BF',
  avaliacao: '#F87171',
};

const ICONE_TIPO: Record<EventoCalendario['tipo'], keyof typeof Ionicons.glyphMap> = {
  nacional: 'flag',
  letivo: 'school',
  avaliacao: 'document-text',
};

function CartaoEvento({ item, index }: { item: EventoCalendario; index: number }) {
  const corAcento = COR_TIPO[item.tipo];
  return (
    <EntradaAnimada
      index={index}
      className="gap-2 rounded-xl border border-slate-800 bg-surface p-4 dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${corAcento}1A` }}
        >
          <Ionicons name={ICONE_TIPO[item.tipo]} size={20} color={corAcento} />
        </View>
        <View className="flex-1">
          <Text
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: corAcento }}
          >
            {ROTULO_TIPO[item.tipo]}
          </Text>
          <Text className="text-base font-semibold text-slate-100">{item.titulo}</Text>
        </View>
      </View>
      <Text className="text-sm text-slate-400">{formatarPeriodo(item)}</Text>
      {item.regresso ? (
        <Text className="text-xs text-slate-500">
          Regresso às aulas: {FORMATO_DATA.format(new Date(item.regresso))}
        </Text>
      ) : null}
      {item.descricao ? <Text className="text-sm text-slate-400">{item.descricao}</Text> : null}
    </EntradaAnimada>
  );
}

/** Continua olhando só pra feriados/interrupções (não avaliação) de
 * propósito — é o mesmo destaque que o widget de tela inicial (Android)
 * mostra, então precisa continuar batendo com `proximoEvento()` de
 * `feriados.ts` sem mudar a assinatura dela (ver `src/features/widget/
 * ProximoEventoWidget.tsx`, que chama a mesma função). */
function CabecalhoDestaque() {
  const proximo = proximoEvento();
  if (!proximo) return null;

  const dataAlvo = proximo.data ?? proximo.inicio ?? '';
  const dias = diasAte(dataAlvo);
  const quando = dias === 0 ? 'É hoje' : dias === 1 ? 'É amanhã' : `Faltam ${dias} dias`;
  const periodo =
    proximo.data || !proximo.fim
      ? FORMATO_DATA.format(new Date(dataAlvo))
      : `${FORMATO_DATA.format(new Date(dataAlvo))} – ${FORMATO_DATA.format(new Date(proximo.fim))}`;

  return (
    <View className="mb-1 gap-1 rounded-xl bg-primary p-5 shadow-sm dark:bg-primary-dark">
      <Text className="text-xs font-semibold uppercase tracking-wide text-white/80">
        Próximo — {quando}
      </Text>
      <Text className="text-lg font-bold text-white">{proximo.nome}</Text>
      <Text className="text-sm text-white/90">{periodo}</Text>
    </View>
  );
}

/**
 * Calendário integrado (feriados + avaliações do aluno, pedido do
 * usuário) — substitui o mural de avisos nesta aba, a pedido explícito
 * do usuário anterior. O mural, o botão de publicar aviso e o back-end
 * (tabela, push, aviso automático de clima) continuam existindo no
 * projeto — só não têm mais tela nenhuma no app (ver README > "Status
 * atual" pro racional completo e pro que foi desligado no banco como
 * consequência).
 */
export default function CalendarioFeriados() {
  const { profile } = useAuth();

  const avaliacoesQuery = useQuery({
    queryKey: ['avaliacoes', 'todas', profile?.id],
    queryFn: () => listarTodasAvaliacoesComData(profile!.id),
    enabled: !!profile,
  });

  const eventos = mesclarEventos(
    listarOrdenados(),
    (avaliacoesQuery.data ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      data: a.data,
      materiaNome: a.materias?.nome,
    })),
  );

  const exportarMutation = useMutation({
    mutationFn: () => exportarIcs(gerarIcs(eventos)),
  });

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FlatList
        data={eventos}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-10"
        ListHeaderComponent={
          <View className="mb-1 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-400">Ano letivo {ANO_LETIVO}</Text>
              <Pressable
                onPress={() => exportarMutation.mutate()}
                disabled={exportarMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Exportar calendário"
                className="min-h-11 flex-row items-center gap-1.5 rounded-md border border-slate-700 px-3"
              >
                <Ionicons name="download-outline" size={14} color="#8B5CF6" />
                <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
                  {exportarMutation.isPending ? 'Exportando...' : 'Exportar'}
                </Text>
              </Pressable>
            </View>
            <CabecalhoDestaque />
          </View>
        }
        renderItem={({ item, index }) => <CartaoEvento item={item} index={index} />}
      />
    </View>
  );
}
