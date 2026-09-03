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
        // Paleta Turma+ — ver README.md > "Identidade visual" para o racional.
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#818CF8',
        },
        accent: {
          DEFAULT: '#F59E0B',
          dark: '#FBBF24',
        },
        success: {
          DEFAULT: '#16A34A',
          dark: '#4ADE80',
        },
        danger: {
          DEFAULT: '#DC2626',
          dark: '#F87171',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#1E293B',
        },
      },
    },
  },
  plugins: [],
};
