/**
 * Versão web deste módulo — vazia de propósito. `task.tsx` (a versão
 * usada em qualquer plataforma sem sufixo `.web`, isto é, nativo)
 * importa `react-native-android-widget` (~1 MB, só faz sentido no
 * Android) de forma estática — mesmo com a chamada real protegida por
 * `Platform.OS === 'android'` internamente, um `import` estático ainda
 * entra no bundle inteiro no alvo web, porque o Metro não elimina
 * código morto atrás de um `if` em tempo de execução. A convenção de
 * nome `.web.tsx` faz o Metro escolher ESTE arquivo pro bundle web
 * (nunca resolve `task.tsx` nesse alvo), cortando a lib inteira do
 * peso do bundle de produção (achado ao vivo — pedido do usuário,
 * "demora muito pra carregar").
 */
export {};
