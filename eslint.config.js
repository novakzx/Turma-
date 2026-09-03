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
    // puro e continua linted normalmente.
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*', 'supabase/functions/*/index.ts'],
  },
]);
