import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { EventoCalendario } from './regras';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOMES_MES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const COR_TIPO: Record<EventoCalendario['tipo'], string> = {
  nacional: '#8B5CF6',
  letivo: '#2DD4BF',
  avaliacao: '#F87171',
};

const ROTULO_LEGENDA: Record<EventoCalendario['tipo'], string> = {
  nacional: 'Feriado',
  letivo: 'Interrupção',
  avaliacao: 'Avaliação',
};

function paraChaveDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Grade do mês com bolinha colorida nos dias que têm evento — pedido do
 * usuário (referência visual anexada tem essa grade em vez de só a lista
 * abaixo). Só mostra o que já existe de verdade em `eventos`
 * (feriado/interrupção/avaliação, ver `regras.ts` — mesma fonte da lista
 * "Próximos Acontecimentos" logo abaixo); a referência também tinha um
 * banner de "greve ao vivo" com número de relatos, mas isso não existe
 * como dado real neste app (o mural de avisos foi desligado, ver
 * `CalendarioFeriados` em `(tabs)/index.tsx`) — inventar um número ali
 * seria mentir pro aluno, então não entrou.
 */
export function GradeMes({ eventos }: { eventos: EventoCalendario[] }) {
  const hoje = useMemo(() => new Date(), []);
  const [mesExibido, setMesExibido] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }));

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario['tipo'][]>();
    for (const evento of eventos) {
      const tipos = mapa.get(evento.data) ?? [];
      tipos.push(evento.tipo);
      mapa.set(evento.data, tipos);
    }
    return mapa;
  }, [eventos]);

  const primeiroDiaSemana = new Date(mesExibido.ano, mesExibido.mes, 1).getDay();
  const totalDias = new Date(mesExibido.ano, mesExibido.mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  function mudarMes(delta: number) {
    setMesExibido(({ ano, mes }) => {
      const data = new Date(ano, mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  }

  const ehMesAtual = mesExibido.ano === hoje.getFullYear() && mesExibido.mes === hoje.getMonth();
  const tiposUsados = useMemo(
    () => Array.from(new Set(eventos.map((e) => e.tipo))) as EventoCalendario['tipo'][],
    [eventos],
  );

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 shadow-sm dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">
          {NOMES_MES[mesExibido.mes]} {mesExibido.ano}
        </Text>
        <View className="flex-row items-center gap-1 rounded-full bg-slate-100 p-1">
          <Pressable
            onPress={() => mudarMes(-1)}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            className="h-8 w-8 items-center justify-center rounded-full"
          >
            <Ionicons name="chevron-back" size={16} color="#464555" />
          </Pressable>
          <Pressable
            onPress={() => mudarMes(1)}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            className="h-8 w-8 items-center justify-center rounded-full"
          >
            <Ionicons name="chevron-forward" size={16} color="#464555" />
          </Pressable>
        </View>
      </View>

      <View className="flex-row justify-around">
        {DIAS_SEMANA.map((dia, i) => (
          <Text key={i} className="w-9 text-center text-xs font-bold text-slate-500">
            {dia}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {celulas.map((dia, i) => {
          if (dia === null) return <View key={`vazio-${i}`} className="h-10 w-[14.28%]" />;
          const chave = paraChaveDia(mesExibido.ano, mesExibido.mes, dia);
          const tipos = eventosPorDia.get(chave) ?? [];
          const ehHoje = ehMesAtual && dia === hoje.getDate();
          return (
            <View key={chave} className="h-10 w-[14.28%] items-center justify-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-xl ${ehHoje ? 'bg-primary dark:bg-primary-dark' : ''}`}
              >
                <Text className={`text-sm ${ehHoje ? 'font-bold text-white' : 'text-slate-900'}`}>
                  {dia}
                </Text>
              </View>
              {tipos.length > 0 ? (
                <View className="absolute bottom-0 flex-row gap-0.5">
                  {tipos.slice(0, 3).map((tipo, j) => (
                    <View
                      key={j}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: COR_TIPO[tipo] }}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {tiposUsados.length > 0 ? (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
          {tiposUsados.map((tipo) => (
            <View key={tipo} className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: COR_TIPO[tipo] }} />
              <Text className="text-xs text-slate-500">{ROTULO_LEGENDA[tipo]}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
