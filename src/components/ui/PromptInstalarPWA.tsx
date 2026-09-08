import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

const CHAVE_DISPENSADO = 'turma-mais:prompt-instalar-dispensado';

/** Evento `beforeinstallprompt` (Chrome/Edge/Android) — não tem tipo
 * pronto no lib.dom padrão do TypeScript (é não-standard, só Chromium),
 * então declara só o que usa daqui. */
type EventoBeforeInstall = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function ehIOS(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function jaInstalado(): boolean {
  const standaloneIOS = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || standaloneIOS === true;
}

type EstadoBanner = { dispensado: boolean; mostrarInstrucaoIOS: boolean };

/** Calcula o estado inicial de forma síncrona (leitura de localStorage/
 * matchMedia, nada assíncrono) — vira o inicializador "preguiçoso" do
 * `useState` em vez de um `setState` dentro de `useEffect` (que o lint
 * de React Compiler deste projeto recusa: dispara um re-render em
 * cascata logo após o primeiro render à toa). */
function estadoInicial(): EstadoBanner {
  if (Platform.OS !== 'web') return { dispensado: true, mostrarInstrucaoIOS: false };

  try {
    if (localStorage.getItem(CHAVE_DISPENSADO) === '1') {
      return { dispensado: true, mostrarInstrucaoIOS: false };
    }
  } catch {
    // Sem acesso a localStorage (aba privada bloqueando, etc.) — trata
    // como "não dispensado ainda", só não vai lembrar na próxima visita.
  }
  if (jaInstalado()) return { dispensado: true, mostrarInstrucaoIOS: false };

  return { dispensado: false, mostrarInstrucaoIOS: ehIOS() };
}

/**
 * Banner "Adicionar à tela de início" (pedido do usuário) — só faz
 * sentido no navegador (`Platform.OS === 'web'`; quem já está no app
 * nativo, quando o EAS estiver configurado, óbvio que já "instalou").
 * Android/Chrome tem prompt de verdade (`beforeinstallprompt`, dá pra
 * disparar com um botão); iOS não tem — Apple nunca expôs esse evento,
 * o único caminho é manual (Compartilhar -> Adicionar à Tela de
 * Início), então ali só mostra a instrução. Não aparece de novo depois
 * de fechado (localStorage) nem se o app já estiver instalado
 * (`display-mode: standalone`).
 */
export function PromptInstalarPWA() {
  const [eventoInstall, setEventoInstall] = useState<EventoBeforeInstall | null>(null);
  const [{ dispensado, mostrarInstrucaoIOS }, setEstado] = useState(estadoInicial);

  useEffect(() => {
    // Sem `beforeinstallprompt` nenhum pra escutar se já vai mostrar a
    // instrução manual do iOS, ou se o banner nem vai aparecer.
    if (Platform.OS !== 'web' || dispensado || mostrarInstrucaoIOS) return;

    function aoTerEventoInstall(evento: Event) {
      evento.preventDefault();
      setEventoInstall(evento as EventoBeforeInstall);
    }
    window.addEventListener('beforeinstallprompt', aoTerEventoInstall);
    return () => window.removeEventListener('beforeinstallprompt', aoTerEventoInstall);
  }, [dispensado, mostrarInstrucaoIOS]);

  function dispensar() {
    setEstado((atual) => ({ ...atual, dispensado: true }));
    try {
      localStorage.setItem(CHAVE_DISPENSADO, '1');
    } catch {
      // Sem persistência — o banner só volta a aparecer nesta mesma
      // sessão/aba, sem quebrar nada.
    }
  }

  async function instalar() {
    if (!eventoInstall) return;
    await eventoInstall.prompt();
    await eventoInstall.userChoice;
    setEventoInstall(null);
    dispensar();
  }

  if (Platform.OS !== 'web' || dispensado || (!eventoInstall && !mostrarInstrucaoIOS)) {
    return null;
  }

  return (
    <View className="mx-4 mt-4 flex-row items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 dark:border-primary-dark/30 dark:bg-primary-dark/10">
      <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
      <View className="flex-1 gap-2">
        <Text className="text-sm font-semibold text-slate-100">
          Adicione o Turma+ à tela de início
        </Text>
        <Text className="text-xs text-slate-400">
          {mostrarInstrucaoIOS
            ? 'Toque no ícone de compartilhar do navegador e depois em "Adicionar à Tela de Início".'
            : 'Acesso mais rápido, tela cheia, sem barra de endereço.'}
        </Text>
        <View className="flex-row gap-2">
          {!mostrarInstrucaoIOS ? (
            <Pressable
              onPress={instalar}
              accessibilityRole="button"
              className="min-h-11 items-center justify-center rounded-md bg-primary px-4 dark:bg-primary-dark"
            >
              <Text className="text-sm font-semibold text-white">Instalar</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={dispensar}
            accessibilityRole="button"
            className="min-h-11 items-center justify-center rounded-md border border-slate-700 px-4"
          >
            <Text className="text-sm text-slate-300">Agora não</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
