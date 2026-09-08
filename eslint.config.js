const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'import/no-duplicates': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Entrypoints de Edge Function rodam em Deno (global `Deno`, imports
    // jsr:/npm:) — fora do que eslint-config-expo entende. _shared/ é TS
    // puro e continua linted normalmente. `sw-push.js` roda no escopo de
    // Service Worker do navegador (globals `self`/`clients`, sem módulo
    // nenhum, servido cru pro navegador em produção) — mesma razão,
    // nenhuma regra de React/import daqui se aplicaria a ele mesmo assim.
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'coverage/*',
      'supabase/functions/*/index.ts',
      'public/sw-push.js',
    ],
  },
]);
