const cores = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modo escuro de verdade (pedido do usuário) — cada token aponta
        // pra uma variável CSS (definida em `src/lib/global.css`, valor
        // claro/escuro trocado por lá) em vez de um hex fixo. Motivo:
        // `dark:` do NativeWind é inerte no alvo web (testado ao vivo,
        // ver comentário longo no topo de `global.css`) — uma variável
        // muda de valor com o tema por cascata normal de CSS, sem
        // depender do mecanismo de variante que não funciona lá.
        //
        // `DEFAULT` e `dark` apontam pra MESMA variável de propósito —
        // isso faz toda classe `dark:bg-primary-dark` (ainda presente
        // em ~60 arquivos, nunca removida) virar um no-op inofensivo em
        // vez de um valor divergente: no nativo (onde `dark:` funciona
        // de verdade) ela resolveria pra o mesmo valor que `bg-primary`
        // já tem; no web (onde não resolve nunca) não faz diferença
        // nenhuma. Simplifica a migração — não precisa caçar e apagar
        // cada `dark:*` do app inteiro só pra isso funcionar certo.
        primary: { DEFAULT: 'var(--color-primary)', dark: 'var(--color-primary)' },
        accent: { DEFAULT: 'var(--color-accent)', dark: 'var(--color-accent)' },
        success: { DEFAULT: 'var(--color-success)', dark: 'var(--color-success)' },
        danger: { DEFAULT: 'var(--color-danger)', dark: 'var(--color-danger)' },
        background: { DEFAULT: 'var(--color-background)', dark: 'var(--color-background)' },
        surface: { DEFAULT: 'var(--color-surface)', dark: 'var(--color-surface)' },
        // Só as tonalidades de `slate` que o app usa de verdade (ver
        // `grep -rohE "(text|bg|border)-slate-[0-9]+"`) ganham variável —
        // as outras (50, 400, 950...) continuam a cor padrão do Tailwind,
        // sem tema (nenhum lugar do app usa essas hoje).
        slate: {
          ...cores.slate,
          100: 'var(--color-slate-100)',
          200: 'var(--color-slate-200)',
          300: 'var(--color-slate-300)',
          500: 'var(--color-slate-500)',
          600: 'var(--color-slate-600)',
          700: 'var(--color-slate-700)',
          800: 'var(--color-slate-800)',
          900: 'var(--color-slate-900)',
        },
      },
    },
  },
  plugins: [],
};
