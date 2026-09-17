import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useColorSchemeSistema, View } from 'react-native';

import {
  CORES_CLARO,
  CORES_ESCURO,
  corDestaqueResolvida,
  overrideCorDestaque,
  paletaIcones,
  type CorDestaqueId,
} from '@/lib/temaCores';

import { carregarCorDestaque, salvarCorDestaque } from './corDestaque';
import {
  aplicarTemaNoDocumento,
  carregarTemaPreferido,
  salvarTemaPreferido,
  type TemaPreferido,
} from './tema';

type TemaContextValor = {
  temaPreferido: TemaPreferido;
  setTemaPreferido: (tema: TemaPreferido) => void;
  /** Já resolvido (claro/escuro de verdade) — "system" nunca aparece
   * aqui, já virou um dos dois. */
  escuro: boolean;
  /** Cores prontas pra usar direto num `color=` de ícone (Ionicons não
   * entende `className` nem variável CSS) — ver `paletaIcones`. */
  cores: ReturnType<typeof paletaIcones>;
  /** Cor de destaque Premium escolhida (`'azul'` é o padrão gratuito) —
   * ver `CATALOGO_CORES_DESTAQUE` em `src/lib/temaCores.ts`. O gate de
   * "só assinante troca" fica em `configuracoes.tsx`, não aqui. */
  corDestaqueId: CorDestaqueId;
  setCorDestaque: (cor: CorDestaqueId) => void;
};

const TemaContext = createContext<TemaContextValor | null>(null);

/**
 * Modo escuro de verdade (pedido do usuário, depois da primeira tentativa
 * ter sido removida por estar morta — ver commit "remove o seletor de
 * tema quebrado"). Dessa vez as cores realmente mudam: ver o comentário
 * grande em `src/lib/global.css` pro porquê de não usar `dark:` do
 * NativeWind (inerte no alvo web, confirmado testando ao vivo) e usar
 * variável CSS (web, via `global.css`) + `vars()` do NativeWind (nativo,
 * aqui embaixo) em vez disso — as duas leem o MESMO objeto de cores
 * (`CORES_CLARO`/`CORES_ESCURO`), então não tem como os dois alvos
 * divergirem por engano.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [temaPreferido, setTemaPreferidoState] = useState<TemaPreferido>('system');
  const [carregado, setCarregado] = useState(false);
  const [corDestaqueId, setCorDestaqueIdState] = useState<CorDestaqueId>('azul');
  const sistemaEscuro = useColorSchemeSistema() === 'dark';

  useEffect(() => {
    carregarTemaPreferido().then((tema) => {
      setTemaPreferidoState(tema);
      setCarregado(true);
      aplicarTemaNoDocumento(tema);
    });
    // Independente do tema claro/escuro -- carrega em paralelo, não
    // bloqueia o `carregado` acima (evita atrasar o flash-guard de tema
    // por causa de uma preferência Premium que a maioria nem tem).
    carregarCorDestaque().then(setCorDestaqueIdState);
  }, []);

  function setTemaPreferido(tema: TemaPreferido) {
    setTemaPreferidoState(tema);
    aplicarTemaNoDocumento(tema);
    void salvarTemaPreferido(tema);
  }

  function setCorDestaque(cor: CorDestaqueId) {
    setCorDestaqueIdState(cor);
    void salvarCorDestaque(cor);
  }

  const escuro = temaPreferido === 'system' ? sistemaEscuro : temaPreferido === 'dark';

  const valor = useMemo<TemaContextValor>(
    () => ({
      temaPreferido,
      setTemaPreferido,
      escuro,
      cores: paletaIcones(escuro, corDestaqueResolvida(corDestaqueId, escuro)),
      corDestaqueId,
      setCorDestaque,
    }),
    [temaPreferido, escuro, corDestaqueId],
  );

  // `vars()` é a forma multiplataforma do NativeWind de prover variável
  // de CSS — cobre o nativo (onde `global.css` não existe/não roda).
  // No web isso também funciona, mas é redundante com a cascata de CSS
  // pura de `global.css` (que já cobre `html`/`body`, fora do alcance de
  // qualquer `View`) — mantido nos dois pra não ter um único ponto de
  // falha, e porque não atrapalha (mesmo valor, mesma variável).
  //
  // Antes do primeiro `carregarTemaPreferido()` resolver, usa o valor
  // que o sistema já reporta (sem esperar o AsyncStorage) — evita um
  // flash de "sempre claro" por um instante em quem tem o sistema em
  // escuro e salvou "escuro" antes.
  const escuroResolvido = carregado ? escuro : sistemaEscuro;
  const corAtual = {
    ...(escuroResolvido ? CORES_ESCURO : CORES_CLARO),
    ...overrideCorDestaque(corDestaqueId, escuroResolvido),
  };

  return (
    <View style={[{ flex: 1 }, vars(corAtual)]}>
      <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
    </View>
  );
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema precisa ser usado dentro de <TemaProvider>.');
  return ctx;
}
