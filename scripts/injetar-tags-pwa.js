// Injeta no `dist/index.html`, depois do `expo export --platform web`, as
// tags de PWA (manifest, theme-color, ícone da tela inicial) que o app
// precisa pra virar "instalável".
//
// Por quê um script à parte em vez de `app/+html.tsx` (o jeito "certo" do
// Expo Router de customizar o HTML raiz): `+html.tsx` só é lido durante
// renderização estática (`web.output: "static"` ou `"server"`) — testado
// direto contra o export real desta versão do Expo (`npx expo export
// --platform web` com o `web.output` padrão, "single"/SPA, que é o que
// este projeto usa e o `vercel.json` espera pra servir tudo por
// `/index.html`) e o arquivo simplesmente não teve efeito nenhum no HTML
// gerado. Mudar pra `web.output: "static"` traria complicação real (uma
// página HTML por rota, rotas dinâmicas tipo `post/[id]` exigiriam
// `generateStaticParams`, e o rewrite do `vercel.json` teria que mudar)
// só pra ganhar 5 linhas de `<head>` — não vale a troca. Pós-processar o
// `index.html` do export é o caminho mais simples e sem risco pro modo
// que o projeto já usa.
const fs = require('node:fs');
const path = require('node:path');

// `process.cwd()` em vez de `__dirname` (que o ESLint deste projeto não
// reconhece como global fora de CommonJS puro) — o Vercel/`npm run` sempre
// roda esse script a partir da raiz do repo, então dá no mesmo.
const CAMINHO_INDEX = path.join(process.cwd(), 'dist', 'index.html');

// `theme-color` casado com o fundo escuro do redesign "dark-first" (era
// o indigo antigo, `#4F46E5`, de antes do app inteiro virar escuro por
// padrão) — sem isso a barra de status/chrome do navegador no celular
// ficava roxa/clara destoando do resto do app.
const TAGS = `
    <meta name="theme-color" content="#0B0E14" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Turma+" />
  </head>`;

let html = fs.readFileSync(CAMINHO_INDEX, 'utf8');

// `viewport-fit=cover` (achado testando no celular de verdade — usuário
// relatou a barra de abas "entrando nas extremidades da tela"): sem isso,
// o Safari/Chrome no iPhone não expõe `env(safe-area-inset-bottom)`
// nenhum pro CSS — `useSafeAreaInsets()` (react-native-safe-area-context)
// depende exatamente desse valor no alvo web, então sem essa diretiva ele
// sempre lê zero, e a barra de abas (calculada achando que não existe
// nenhum recorte/home indicator embaixo) fica colada bem na borda física
// da tela, sem a folga de segurança que um iPhone de verdade precisa.
// Expo gera o `<meta name="viewport">` sozinho no export; substitui em
// vez de injetar um segundo (dois `viewport` no mesmo HTML — o navegador
// só respeita o primeiro, então só *substituir* resolve de verdade).
const VIEWPORT_REGEX = /<meta name="viewport"[^>]*>/;
if (VIEWPORT_REGEX.test(html)) {
  html = html.replace(
    VIEWPORT_REGEX,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
  );
} else {
  console.error('injetar-tags-pwa: tag <meta name="viewport"> não encontrada — abortando.');
  process.exit(1);
}

if (html.includes('apple-mobile-web-app-title')) {
  console.warn('injetar-tags-pwa: tags de cabeçalho já presentes, só o viewport foi atualizado.');
  fs.writeFileSync(CAMINHO_INDEX, html);
  process.exit(0);
}

if (!html.includes('</head>')) {
  console.error('injetar-tags-pwa: `</head>` não encontrado em dist/index.html — abortando.');
  process.exit(1);
}

fs.writeFileSync(CAMINHO_INDEX, html.replace('</head>', TAGS));
console.warn('injetar-tags-pwa: tags de PWA + viewport-fit=cover injetados em dist/index.html.');
