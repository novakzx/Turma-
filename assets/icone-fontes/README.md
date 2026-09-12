# Fontes do ícone

SVG de origem do ícone do Turma+ (capelo de formatura branco sobre o
roxo da marca, `#8B5CF6`) — mesma técnica documentada no `CLAUDE.md`
("gerar ícone/splash sem depender de Figma/gerador de imagem por IA"):
formas básicas em SVG, rasterizadas com `resvg-cli`, sem instalar nada
permanente no projeto.

- `icone.svg` — ícone completo (fundo + capelo), usado pra
  `assets/icon.png`, `public/icon-192.png`, `public/icon-512.png` e
  `assets/favicon.png`.
- `icone-android-fundo.svg` / `icone-android-frente.svg` — camadas
  separadas do ícone adaptável do Android (`assets/android-icon-
  background.png` / `-foreground.png` / `-monochrome.png`, esta última
  reusa a camada de frente).
- `icone-glifo-roxo.svg` — só o capelo em roxo sobre transparente,
  usado em `assets/splash-icon.png` (splash nativo, fundo claro).

Pra regenerar depois de editar um destes arquivos:

```bash
npx --yes resvg-cli --fit-width 1024 assets/icone-fontes/icone.svg assets/icon.png
npx --yes resvg-cli --fit-width 512 assets/icone-fontes/icone.svg public/icon-512.png
npx --yes resvg-cli --fit-width 192 assets/icone-fontes/icone.svg public/icon-192.png
npx --yes resvg-cli --fit-width 256 assets/icone-fontes/icone.svg assets/favicon.png
npx --yes resvg-cli --fit-width 1024 assets/icone-fontes/icone-android-fundo.svg assets/android-icon-background.png
npx --yes resvg-cli --fit-width 1024 assets/icone-fontes/icone-android-frente.svg assets/android-icon-foreground.png
npx --yes resvg-cli --fit-width 1024 assets/icone-fontes/icone-android-frente.svg assets/android-icon-monochrome.png
npx --yes resvg-cli --fit-width 600 assets/icone-fontes/icone-glifo-roxo.svg assets/splash-icon.png
```

Cuidado ao conferir o resultado de um PNG com fundo transparente e
marca branca: ele aparece "em branco" sobre um visualizador de fundo
branco — não é bug, é o matte do visualizador. Componha sobre um fundo
escuro antes de descartar como quebrado (ver `CLAUDE.md`).
