import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { diasAte, proximoEvento } from '@/features/calendario/feriados';

/**
 * Widget de tela inicial (Android — pedido do usuário; iOS ficou de
 * fora desta versão, ver README, o mesmo motivo do Apple Sign In:
 * exige extensão nativa própria via Xcode, fora do alcance de
 * `react-native-android-widget`/config plugin). Mostra o próximo
 * feriado/evento do calendário escolar — mesma fonte de dado e mesmo
 * texto da tela "Feriados" (`CabecalhoDestaque`, `(tabs)/index.tsx`),
 * só que sem precisar abrir o app. Dado é 100% local (sem rede/sessão
 * — `FERIADOS_E_INTERRUPCOES` é uma lista fixa no bundle), o que
 * mantém o handler do widget simples: não precisa lidar com token de
 * sessão expirado nem estado de carregamento.
 */
export function ProximoEventoWidget() {
  const proximo = proximoEvento();

  if (!proximo) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <TextWidget text="Turma+" style={{ fontSize: 13, fontWeight: 'bold', color: '#8B5CF6' }} />
        <TextWidget
          text="Sem próximo evento no calendário"
          style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

  const dataAlvo = proximo.data ?? proximo.inicio ?? '';
  const dias = diasAte(dataAlvo);
  const quando = dias === 0 ? 'É hoje' : dias === 1 ? 'É amanhã' : `Faltam ${dias} dias`;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#8B5CF6',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <TextWidget
        text={`TURMA+ · ${quando.toUpperCase()}`}
        style={{ fontSize: 11, fontWeight: 'bold', color: '#C7D2FE', letterSpacing: 1 }}
      />
      <TextWidget
        text={proximo.nome}
        maxLines={2}
        truncate="END"
        style={{ fontSize: 17, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 }}
      />
    </FlexWidget>
  );
}
