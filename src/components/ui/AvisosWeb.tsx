import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { carregarConsentimentoCookies, salvarConsentimentoCookies } from '@/features/web/cookies';
import { avisoInstalarFoiDispensado, dispensarAvisoInstalar } from '@/features/web/instalarApp';

import { Button } from './Button';

/** Evento não padronizado (Chrome/Edge/Android), sem tipo no `lib.dom` —
 * `deferred.prompt()` é o que abre o diálogo nativo de instalação. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

function estaRodandoInstalado(): boolean {
  const standaloneIOS = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || standaloneIOS === true;
}

function ehIOSSafari(): boolean {
  const ua = window.navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  // No iOS, outros navegadores (Chrome, Firefox) também usam a engine do
  // Safari mas não têm acesso ao "Adicionar à Tela de Início" da mesma
  // forma simples — a instrução do banner (botão de compartilhar) só vale
  // pro Safari de verdade.
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return iOS && safari;
}

/**
 * Dois avisos só do target web, sequenciais (nunca os dois ao mesmo tempo,
 * pra não empilhar banner em cima de banner): primeiro o de cookies, e só
 * depois de resolvido esse, o de "adicionar à tela inicial" — esse último
 * só aparece se o app não estiver rodando instalado e o usuário não tiver
 * dispensado antes. Sem UI nenhuma no nativo (iOS/Android via Expo Go/EAS
 * não usa cookie e já é o "app instalado" por definição).
 */
export function AvisosWeb() {
  const [consentimentoCookies, setConsentimentoCookies] = useState<'aceito' | 'recusado' | null>(
    null,
  );
  const [carregouCookies, setCarregouCookies] = useState(false);
  const [podeMostrarInstalar, setPodeMostrarInstalar] = useState(false);
  const [promptInstalacao, setPromptInstalacao] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarInstrucaoIOS, setMostrarInstrucaoIOS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    carregarConsentimentoCookies().then((valor) => {
      setConsentimentoCookies(valor);
      setCarregouCookies(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || estaRodandoInstalado()) return;

    avisoInstalarFoiDispensado().then((dispensado) => {
      if (dispensado) return;
      if (ehIOSSafari()) {
        setMostrarInstrucaoIOS(true);
        return;
      }
      setPodeMostrarInstalar(true);
    });

    // Chrome/Edge/Android disparam esse evento quando acham que o app é
    // "instalável" — sem capturar e segurar o evento aqui, `event.prompt()`
    // não existiria mais depois (o navegador só oferece uma vez).
    function aoFicarInstalavel(evento: Event) {
      evento.preventDefault();
      setPromptInstalacao(evento as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setPromptInstalacao(null);
      setPodeMostrarInstalar(false);
      setMostrarInstrucaoIOS(false);
      dispensarAvisoInstalar();
    }
    window.addEventListener('beforeinstallprompt', aoFicarInstalavel);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoFicarInstalavel);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const handleAceitarCookies = () => {
    setConsentimentoCookies('aceito');
    salvarConsentimentoCookies('aceito');
  };
  const handleRecusarCookies = () => {
    setConsentimentoCookies('recusado');
    salvarConsentimentoCookies('recusado');
  };

  const handleFecharInstalar = () => {
    setPodeMostrarInstalar(false);
    setMostrarInstrucaoIOS(false);
    dispensarAvisoInstalar();
  };

  const handleInstalar = async () => {
    if (!promptInstalacao) return;
    await promptInstalacao.prompt();
    setPromptInstalacao(null);
    setPodeMostrarInstalar(false);
    dispensarAvisoInstalar();
  };

  if (carregouCookies && consentimentoCookies === null) {
    return (
      <View className="gap-3 border-t border-slate-700 bg-surface p-4 pb-6 shadow-lg shadow-slate-900/10 dark:bg-surface-dark">
        <Text className="text-sm text-slate-400">
          Usamos armazenamento local só pra manter você conectado e lembrar suas preferências (como
          o tema claro/escuro). Não usamos cookie de rastreamento nem de publicidade.
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Só o essencial" variant="secondary" onPress={handleRecusarCookies} />
          </View>
          <View className="flex-1">
            <Button label="Aceitar" variant="primary" onPress={handleAceitarCookies} />
          </View>
        </View>
      </View>
    );
  }

  if (podeMostrarInstalar || mostrarInstrucaoIOS) {
    return (
      <View className="gap-3 border-t border-slate-700 bg-surface p-4 pb-6 shadow-lg shadow-slate-900/10 dark:bg-surface-dark">
        <Text className="text-sm font-semibold text-slate-100">
          Adicione o Turma+ à tela inicial
        </Text>
        <Text className="text-sm text-slate-400">
          {mostrarInstrucaoIOS
            ? 'Toque no ícone de compartilhar do Safari e depois em "Adicionar à Tela de Início".'
            : 'Acesso mais rápido, direto da tela inicial do seu aparelho — como um app de verdade.'}
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Agora não" variant="secondary" onPress={handleFecharInstalar} />
          </View>
          {promptInstalacao ? (
            <View className="flex-1">
              <Button label="Instalar" variant="primary" onPress={handleInstalar} />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return null;
}
