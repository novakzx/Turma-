/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' é o que o NativeWind espera pra `useColorScheme()` funcionar
  // (ver app/_layout.tsx) — 'media' quebra esse hook com um throw interno
  // ("Cannot manually set color scheme, as dark mode is type 'media'").
  // Ele já segue o sistema por padrão, sem precisar de toggle manual;
  // Fase 6 usa esse mesmo hook pra expor um toggle explícito se pedirem.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta Turma+ v3 (redesign "dark-first / fintech", pedido do
        // usuário — referência explícita Nubank/Revolut, não o dashboard
        // claro tipo Stripe/Linear da v2). Achado importante que moldou
        // esta escolha: no alvo **web** desta versão do NativeWind, as
        // classes `dark:` nunca chegam a ativar de verdade (bug
        // documentado em `app/_layout.tsx` — a classe "dark" não é
        // aplicada no `<html>`, mesmo com `useColorScheme()` lendo o
        // valor certo). Ou seja: pra um visual "escuro por padrão" de
        // verdade funcionar no navegador (o alvo que este projeto testa
        // e publica hoje), o escuro não podia depender de `dark:` —
        // tinha que SER o valor padrão (`DEFAULT`). Por isso `background`/
        // `surface` DEFAULT já são escuros aqui, e toda classe solta
        // `text-slate-900`/`border-slate-100`/`bg-white` etc. (pensada
        // pra fundo claro) foi trocada em todo o app pelo par que antes
        // só existia dentro de `dark:` (ver commit) — no nativo
        // (iOS/Android, onde `dark:` funciona de verdade), a variante
        // `dark` de cada token abaixo é só uma leve variação da mesma
        // paleta escura, não um tema claro alternativo: este app não
        // tem "modo claro" de propósito, do mesmo jeito que Nubank não tem.
        primary: {
          DEFAULT: '#8B5CF6',
          dark: '#A78BFA',
        },
        accent: {
          DEFAULT: '#2DD4BF',
          dark: '#5EEAD4',
        },
        success: {
          DEFAULT: '#22C55E',
          dark: '#4ADE80',
        },
        danger: {
          DEFAULT: '#F87171',
          dark: '#FCA5A5',
        },
        background: {
          DEFAULT: '#0B0E14',
          dark: '#05060A',
        },
        surface: {
          DEFAULT: '#171B26',
          dark: '#11141C',
        },
      },
    },
  },
  plugins: [],
};
