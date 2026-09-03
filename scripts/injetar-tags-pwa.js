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

const TAGS = `
    <meta name="theme-color" content="#4F46E5" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Turma+" />
  </head>`;

const html = fs.readFileSync(CAMINHO_INDEX, 'utf8');

if (html.includes('apple-mobile-web-app-title')) {
  console.warn('injetar-tags-pwa: tags já presentes, nada a fazer.');
  process.exit(0);
}

if (!html.includes('</head>')) {
  console.error('injetar-tags-pwa: `</head>` não encontrado em dist/index.html — abortando.');
  process.exit(1);
}

fs.writeFileSync(CAMINHO_INDEX, html.replace('</head>', TAGS));
console.warn('injetar-tags-pwa: tags de PWA injetadas em dist/index.html.');
