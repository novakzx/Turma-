import { Ionicons } from '@expo/vector-icons';
import { FlatList, Text, View } from 'react-native';

import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import {
  ANO_LETIVO,
  diasAte,
  listarOrdenados,
  proximoEvento,
  type FeriadoOuInterrupcao,
} from '@/features/calendario/feriados';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatarPeriodo(item: FeriadoOuInterrupcao): string {
  if (item.data) return FORMATO_DATA.format(new Date(item.data));
  if (item.inicio && item.fim) {
    return `${FORMATO_DATA.format(new Date(item.inicio))} – ${FORMATO_DATA.format(new Date(item.fim))}`;
  }
  return '';
}

function ROTULO_TIPO(tipo: FeriadoOuInterrupcao['tipo']): string {
  return tipo === 'nacional' ? 'Feriado nacional' : 'Interrupção letiva';
}

function CartaoFeriado({ item, index }: { item: FeriadoOuInterrupcao; index: number }) {
  const nacional = item.tipo === 'nacional';
  const corAcento = nacional ? '#4F46E5' : '#F59E0B';
  return (
    <EntradaAnimada
      index={index}
      className="gap-2 rounded-3xl border border-slate-100 bg-surface p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${corAcento}1A` }}
        >
          <Ionicons name={nacional ? 'flag' : 'school'} size={20} color={corAcento} />
        </View>
        <View className="flex-1">
          <Text
            className={`text-xs font-semibold uppercase tracking-wide ${
              nacional ? 'text-primary dark:text-primary-dark' : 'text-accent dark:text-accent-dark'
            }`}
          >
            {ROTULO_TIPO(item.tipo)}
          </Text>
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {item.nome}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-slate-600 dark:text-slate-400">{formatarPeriodo(item)}</Text>
      {item.regresso ? (
        <Text className="text-xs text-slate-500 dark:text-slate-500">
          Regresso às aulas: {FORMATO_DATA.format(new Date(item.regresso))}
        </Text>
      ) : null}
      {item.descricao ? (
        <Text className="text-sm text-slate-600 dark:text-slate-400">{item.descricao}</Text>
      ) : null}
    </EntradaAnimada>
  );
}

function CabecalhoDestaque() {
  const proximo = proximoEvento();
  if (!proximo) return null;

  const dataAlvo = proximo.data ?? proximo.inicio ?? '';
  const dias = diasAte(dataAlvo);
  const quando = dias === 0 ? 'É hoje' : dias === 1 ? 'É amanhã' : `Faltam ${dias} dias`;

  return (
    <View className="mb-1 gap-1 rounded-3xl bg-primary p-5 shadow-md shadow-primary/30 dark:bg-primary-dark">
      <Text className="text-xs font-semibold uppercase tracking-wide text-white/80">
        Próximo — {quando}
      </Text>
      <Text className="text-lg font-bold text-white">{proximo.nome}</Text>
      <Text className="text-sm text-white/90">{formatarPeriodo(proximo)}</Text>
    </View>
  );
}

/**
 * Calendário de feriados escolares (ano letivo 2026/2027) — substitui o
 * mural de avisos nesta aba, a pedido explícito do usuário. O mural, o
 * botão de publicar aviso e o back-end (tabela, push, aviso automático
 * de clima) continuam existindo no projeto — só não têm mais tela
 * nenhuma no app (ver README > "Status atual" pro racional completo e
 * pro que foi desligado no banco como consequência).
 */
export default function CalendarioFeriados() {
  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FlatList
        data={listarOrdenados()}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-10"
        ListHeaderComponent={
          <View className="mb-1 gap-3">
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Ano letivo {ANO_LETIVO}
            </Text>
            <CabecalhoDestaque />
          </View>
        }
        renderItem={({ item, index }) => <CartaoFeriado item={item} index={index} />}
      />
    </View>
  );
}
