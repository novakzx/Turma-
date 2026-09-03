// Permite `import '@/lib/global.css'` (import de efeito colateral, sem
// tipo real de retorno) no _layout.tsx sem o TS reclamar do módulo.
declare module '*.css';
