import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { ProximoEventoWidget } from './ProximoEventoWidget';

/**
 * Registra o handler nativo do widget (`RNWidgetBackgroundTask`, ver
 * `react-native-android-widget`) — precisa rodar uma vez ao carregar o
 * bundle JS, então é importado por efeito colateral (sem nada
 * exportado usado) direto em `app/_layout.tsx`, igual
 * `WebBrowser.maybeCompleteAuthSession()` em `features/auth/api.ts`.
 *
 * `Platform.OS === 'android'` explícito aqui — achado testando de
 * verdade: `registerWidgetTaskHandler` chama
 * `AppRegistry.registerHeadlessTask` por baixo, e o polyfill do
 * `AppRegistry` no target **web** do React Native não implementa esse
 * método (`TypeError: registerHeadlessTask is not a function`),
 * quebrando o app inteiro (tela em branco) assim que `_layout.tsx`
 * carregava. O restante da lib (`AndroidWidget`, os componentes de
 * widget) já se protege sozinho fora do Android, mas essa chamada
 * específica não — o guard explícito por plataforma é necessário aqui,
 * não é redundante com o que a lib já faz.
 *
 * Só existe um widget hoje (`ProximoEvento`), então o handler ignora
 * `widgetInfo.widgetName` e sempre desenha o mesmo componente — se um
 * segundo widget for adicionado no futuro, isso precisa virar um
 * `switch` por nome.
 */
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(async ({ renderWidget }) => {
    renderWidget(<ProximoEventoWidget />);
  });
}
