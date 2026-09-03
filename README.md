# Turma+

App mobile pra estudantes do ensino básico e secundário (Portugal): mural de avisos da escola, ferramentas de estudo (chat com IA, calculadora de notas) e uma comunidade da turma (feed + chat), tudo num só lugar.

> Projeto em construção por fases — ver [Roadmap](#roadmap) e [Status atual](#status-atual).

## Stack

| Camada            | Escolha                                                          |
| ----------------- | ---------------------------------------------------------------- |
| App mobile        | React Native + Expo (SDK 57), TypeScript estrito                 |
| Navegação         | Expo Router                                                      |
| Estilo            | NativeWind (Tailwind pra React Native)                           |
| Dados do servidor | TanStack Query                                                   |
| Estado local      | Zustand                                                          |
| Backend           | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| Push              | expo-notifications + Expo Push Service                           |
| IA de estudo      | API da Gemini (Google), chamada só por Edge Function             |
| Previsão do tempo | Open-Meteo                                                       |
| Testes            | Jest + jest-expo + React Native Testing Library                  |

**Regra de ouro:** nenhuma chave de API (Gemini, service role do Supabase) fica no app. Tudo que precisa de segredo passa por uma Edge Function.

> Nota: o brief original pedia a API da Anthropic (Claude) pro chat de estudo; trocado pra Gemini a pedido explícito do usuário depois da Fase 3 já entregue (ver "Status atual").

## Setup

Pré-requisitos: Node 20+, npm, e o app [Expo Go](https://expo.dev/go) (ou um emulador Android/simulador iOS) pra rodar no celular.

```bash
npm install
npm start
```

Isso abre o Metro bundler — escaneie o QR code com o Expo Go ou rode `npm run android` / `npm run ios` / `npm run web`.

### Variáveis de ambiente

Copie `.env.example` pra `.env` e preencha:

| Variável                        | Onde é usada                                     | Segredo?                                                |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Cliente (app)                                    | Não — pode ficar no bundle                              |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Cliente (app)                                    | Não — protegida pelas policies de RLS, não pelo segredo |
| `GEMINI_API_KEY`                | Edge Function (`supabase secrets set`)           | **Sim** — nunca no app                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Edge Function (`supabase secrets set`)           | **Sim** — nunca no app                                  |
| `EXPO_ACCESS_TOKEN`             | Edge Function, se usar envio de push autenticado | **Sim** — nunca no app                                  |

As duas últimas linhas da tabela são secrets de Edge Function, não variáveis do app — não existe `.env` pra elas neste repo; são configuradas direto no projeto Supabase (`supabase secrets set NOME=valor`).

### Edge Functions e automações

| Nome              | Disparo                                                               | O que faz                                                                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notificar-aviso` | Trigger `AFTER INSERT` em `avisos` (`private.notificar_aviso_criado`) | Lê `push_token` de quem tem direito ao aviso (escopo escola/turma, só `aluno` — ver `supabase/functions/_shared/regras.ts`) e manda pro Expo Push Service.                                                                                                                    |
| `aviso-clima`     | `pg_cron`, a cada 4h (`aviso-clima-periodico`)                        | Pra cada escola com `latitude`/`longitude` cadastrada, consulta o Open-Meteo e cria um aviso `tipo='trajeto'` quando a previsão passa o limite configurável daquela escola. O INSERT aciona sozinho o trigger acima.                                                          |
| `chat-estudo`     | Chamada direta do app (`supabase.functions.invoke`)                   | Recebe matéria + mensagem + modo (explicar/dúvida/resumo/plano), monta o histórico da conversa (`chat_ia_mensagens`, só leitura pro cliente) e o prompt de tutor (`supabase/functions/_shared/regrasEstudo.ts`), chama a Gemini e grava as duas mensagens com a service role. |

`notificar-aviso`/`aviso-clima` têm `verify_jwt` ligado e autenticam com a chave anon do projeto (pública, a mesma do `.env`) — chamadas servidor-a-servidor (trigger/cron), sem CORS envolvido. `chat-estudo` **é** chamada direto do navegador/app, então precisa responder o preflight `OPTIONS` com os headers de CORS certos — sem isso o request nem sai do cliente (achado testando de verdade: ver `supabase/functions/chat-estudo/index.ts`). Todas usam a `SUPABASE_SERVICE_ROLE_KEY` que o runtime já injeta sozinho pra ler/escrever ignorando RLS quando precisam — não precisou gerenciar segredo próprio via `supabase secrets set` pra isso.

**`chat-estudo` exige `GEMINI_API_KEY`** como secret da função (`supabase secrets set GEMINI_API_KEY=...`, ou Studio → Edge Functions → Secrets) — sem isso ela responde 503 com uma mensagem clara em vez de quebrar. Modelo usado: `gemini-flash-latest` (único id confirmado de verdade — a lista de modelos da Gemini muda com frequência, ver comentário em `supabase/functions/_shared/regrasEstudo.ts` sobre por que a escalada de modelo por complexidade do brief original não foi reativada ainda).

Pra redeployar depois de mexer no código: `supabase functions deploy <nome>` (ou pelo MCP do Supabase, como foi feito aqui).

### Banco de dados (Supabase)

O schema inicial (todas as tabelas do modelo de dados + RLS) está versionado em [`supabase/migrations/`](supabase/migrations). Pra aplicar num projeto Supabase:

1. Crie um projeto em [supabase.com](https://supabase.com) (ou use um já existente).
2. Instale a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) e rode `supabase login`.
3. `supabase link --project-ref <seu-project-ref>`
4. `supabase db push` — aplica as migrations no projeto remoto.
5. Preencha pelo menos uma linha em `escolas` e `turmas` pelo Supabase Studio (gerenciar escola/turma direto pelo Studio é a decisão do MVP — ver seção "Fora do escopo" do brief original).

### Build via EAS e preparação pra loja

O projeto já está configurado pra build gerenciado (`eas.json`, ícones e splash screen prontos em `assets/`) — falta só a parte que exige uma conta Expo de verdade, que ninguém além de quem tem acesso a ela consegue fazer:

1. `npm install -g eas-cli` (ou use `npx eas-cli` direto).
2. `eas login` — entra com (ou cria) uma conta em [expo.dev](https://expo.dev).
3. `eas init` — cria o projeto no EAS e escreve `extra.eas.projectId` no `app.json` sozinho. **Esse passo também resolve** a limitação de push notification listada abaixo (`getExpoPushTokenAsync` precisa desse `projectId`).
4. `eas build --profile preview --platform android` (ou `ios`) — gera um build instalável sem precisar publicar em loja ainda; `--profile production` é o perfil final.
5. Antes de submeter de verdade: troque `ios.bundleIdentifier` e `android.package` em `app.json` (hoje `com.turmamais.app`, um placeholder) pelo identificador real da conta/organização que vai publicar, e revise `expo.version`/`android.versionCode`/`ios.buildNumber` (o `eas.json` já tem `"autoIncrement": true` no perfil `production`, então o EAS incrementa sozinho a cada build).
6. `eas submit` — envia o build pra App Store Connect / Google Play Console (exige conta de desenvolvedor paga nas duas lojas, fora do controle deste repo).

Ícones e splash já estão prontos (`assets/icon.png`, `android-icon-*.png`, `favicon.png`, `splash-icon*.png` — gerados programaticamente a partir da identidade visual do app, ver seção abaixo) — não precisa desenhar nada antes do primeiro build.

### Deploy no Vercel (preview web)

**Importante:** Turma+ é um app **mobile** (React Native + Expo) — o app "de verdade" roda em iOS/Android via Expo Go ou o build EAS acima, não no navegador. O que o Vercel hospeda aqui é o _export web_ do Expo Router (`npx expo export --platform web`, o mesmo target usado neste README pra testar no browser): uma versão SPA do app rodando no navegador, útil pra demo/preview rápido link-clicável, com as mesmas limitações já listadas em "Limitações conhecidas" (push notification, `Alert.prompt`, modo escuro no target web).

Já está configurado (`vercel.json`: comando de build, `dist/` como saída, rewrite de SPA pra toda rota cair em `index.html`, senão `/feed` ou `/post/123` dão 404 num reload direto). Só falta importar o projeto:

1. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe `novakzx/Turma-` (o repositório já está no ar — ver seção principal do README/`git remote`).
2. Nas variáveis de ambiente do projeto na Vercel, adicione `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (os mesmos valores do seu `.env` local — são públicas, protegidas por RLS, não segredo de verdade, mas o build não funciona sem elas). **Nunca** adicione `GEMINI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` aqui — essas só existem como secret de Edge Function, nunca no bundle do app (ver "Segurança e privacidade").
3. Deploy. A Vercel detecta o `vercel.json` sozinha (`framework: null` — não é Next.js nem nenhum framework que ela reconheça automaticamente).

Testado localmente antes de configurar isso: `npx expo export --platform web` gera `dist/` sem erro (bundle de ~3.3MB, dentro do esperado pra um app com Reanimated + vector-icons + Supabase).

### Scripts

| Comando                           | O que faz                                                |
| --------------------------------- | -------------------------------------------------------- |
| `npm start`                       | Sobe o Metro / Expo dev server                           |
| `npm run lint`                    | ESLint (`eslint-config-expo` + regras do projeto)        |
| `npm run format` / `format:check` | Prettier (com o plugin de ordenação de classes Tailwind) |
| `npm run typecheck`               | `tsc --noEmit`                                           |
| `npm test` / `test:watch`         | Jest + React Native Testing Library                      |

CI (`.github/workflows/ci.yml`) roda lint, format:check, typecheck e test em cada push/PR.

## Identidade visual

Nome do app: **Turma+**. Paleta pensada pra público adolescente sem parecer infantilizada, com contraste ok em claro/escuro (tokens em `tailwind.config.js`):

| Token        | Claro     | Escuro    | Uso                     |
| ------------ | --------- | --------- | ----------------------- |
| `primary`    | `#4F46E5` | `#818CF8` | ações principais, links |
| `accent`     | `#F59E0B` | `#FBBF24` | destaque de aviso/prova |
| `success`    | `#16A34A` | `#4ADE80` | confirmações            |
| `danger`     | `#DC2626` | `#F87171` | ação destrutiva, erro   |
| `background` | `#FFFFFF` | `#0F172A` | fundo de tela           |
| `surface`    | `#F8FAFC` | `#1E293B` | cards, inputs           |

Modo escuro segue a preferência do sistema por padrão (`nativewind`'s `useColorScheme`, `darkMode: 'class'` no Tailwind) — dá pra evoluir pra um toggle manual na Fase 6 sem mudar a estratégia.

**Linguagem visual** (redesenho pedido junto com a Fase 6): pílulas arredondadas em vez de cantos retos (`rounded-full`/`rounded-2xl`/`rounded-3xl` em quase tudo — botão, campo, card, chip), ícone (`@expo/vector-icons`/Ionicons) em praticamente toda ação e badge de tipo, cards com sombra leve (`shadow-sm`/`shadow-slate-900/5`) e barra de abas flutuante arredondada com ícone por aba. Toque num botão encolhe levemente (`react-native-reanimated`) e um card de lista entra com um fade+slide em cascata (`src/components/ui/EntradaAnimada.tsx`) — ambos desligados quando o sistema pede "reduzir movimento" (`useReducedMotion`). `Animated.View`/`AnimatedPressable` do Reanimated não entendem `className` sozinhos — `src/lib/nativewindAnimated.ts` registra esse suporte uma vez, importado no `app/_layout.tsx` raiz.

**Ícone e splash**: marca "T+" (T branco + badge circular âmbar com "+") sobre fundo índigo — mesma paleta do app, gerada como PNG a partir de SVG (não é desenho à mão, é código: ver `git log` desta fase se quiser regenerar/ajustar). `assets/icon.png` é o ícone principal (bleed total, sem cantos arredondados — o próprio iOS aplica a máscara); `android-icon-{foreground,background,monochrome}.png` seguem o formato de ícone adaptativo do Android (camada de frente com a marca, camada de fundo sólida, e uma versão monocromática pro tema "themed icon" do Android 13+); `splash-icon.png`/`splash-icon-dark.png` são a marca sozinha, sobre fundo transparente, pro splash screen claro/escuro (`expo-splash-screen`, configurado em `app.json`).

## Estrutura de pastas

```
app/
  _layout.tsx         # Stack.Protected: escolhe (auth)/(onboarding)/(app) por sessão+perfil
  (auth)/             # Login (index) e cadastro — grupo ativo sem sessão
  (onboarding)/       # Escolha de escola/turma — grupo ativo com sessão incompleta
  (app)/              # Área logada — grupo ativo com onboarding completo
    (tabs)/           # Avisos, Feed, Chat, Estudo, Notas, Perfil
    novo-aviso.tsx    # Modal — só professor/coordenacao chega aqui de verdade (RLS + UI)
    novo-post.tsx     # Modal — criar post (texto/foto/evento/lembrete) na turma
    post/[id].tsx     # Detalhe do post: comentários, denúncia, apagar (autor/staff)
    sala/[id].tsx     # Sala de chat: mensagens em tempo real, moderação (staff)
    editar-perfil.tsx       # Modal — nome, nome de usuário, bio, foto (upload)
    minhas-publicacoes.tsx  # Posts do próprio usuário (mesmo card do feed, filtrado por autor)
src/
  features/           # Uma pasta por domínio: auth, onboarding, perfil, avisos, notificacoes, notas, estudo, feed, chat
  components/ui/      # Componentes visuais reutilizáveis, sem regra de negócio (inclui EntradaAnimada.tsx)
  lib/                # Supabase client, TanStack Query client, global.css, nativewindAnimated.ts (registro de className pro Reanimated)
  stores/             # Zustand — só estado client-side (filtros, rascunhos)
  types/              # Tipos compartilhados (database.ts é gerado pelo Supabase CLI)
supabase/
  migrations/         # Schema versionado, aplicado via `supabase db push`
  seed.sql            # Dados de exemplo (escolas/turmas de Lisboa/Setúbal + matérias de uma turma)
  functions/
    _shared/          # Lógica pura das Edge Functions (regras.ts, regrasEstudo.ts — testada com Jest)
    notificar-aviso/  # Dispara push quando um aviso é criado
    chat-estudo/      # Chat com IA por matéria (precisa de GEMINI_API_KEY)
    aviso-clima/      # Cron: cria aviso automático de trajeto via Open-Meteo
```

## Segurança e privacidade

O público é majoritariamente menor de idade — isto é requisito de MVP, não um item de "fase 2":

- Toda tabela sensível tem Row Level Security habilitada desde a primeira migration, com policies por papel (`aluno` / `professor` / `coordenacao`) e por escopo (escola/turma) — não é um filtro só no app.
- `papel` do próprio perfil nunca é editável pelo usuário — só por quem administra o banco (Studio/SQL) — o que evita autopromoção pra professor/coordenacao. No cadastro, todo mundo entra como `aluno`; `escola_id`/`turma_id` **são** editáveis pelo próprio usuário (é o que o onboarding da Fase 1 grava).
- Silenciar um usuário (`profiles.silenciado_ate`) só pode ser feito por professor/coordenacao — reforçado por um trigger no banco, não só pela regra do app. O prazo (1h/24h) é calculado no banco (`silenciar_usuario`, `now() + interval`), não no cliente — um relógio de dispositivo errado não pode gravar um prazo que já nasce expirado.
- Mensagem apagada por moderação é soft-delete (`mensagens_chat.apagada`) e some da lista de quem não é staff já na policy de `SELECT` (não é só escondida na UI); excluir a própria conta (Fase 1) deve apagar de fato o histórico de mensagens do usuário via `ON DELETE CASCADE`.
- Não existe sala de chat 1-a-1 aluno-aluno — toda sala é de turma, matéria ou assunto, sempre supervisionável por professor/coordenacao. Sala de turma/matéria nasce sozinha (trigger) quando a turma/matéria é criada; só sala de assunto é criada pelo aluno, e trancar/destrancar é ação exclusiva de staff.
- Nenhuma chave de API sensível (Gemini, service role) chega ao bundle do app — variável sem prefixo `EXPO_PUBLIC_` não é visível no cliente e vive só como secret de Edge Function.
- Funções auxiliares de RLS (`current_papel`, `is_staff`, etc.) moram no schema `private`, fora do que o PostgREST expõe como API pública — evita que virem endpoint (`/rest/v1/rpc/...`) chamável por qualquer um.
- **Pendente de configuração manual** (não tem endpoint de API pra isso): ligar "Leaked Password Protection" em Studio → Authentication → Policies, pra bloquear senha de cadastro conhecida em vazamento (checagem via HaveIBeenPwned).
- Chat com IA (`chat_ia_mensagens`) não tem policy de `INSERT` pra `authenticated` — só a Edge Function `chat-estudo`, com a service role key, grava lá. Isso impede um cliente forjar uma mensagem "assistente" (fingir que a IA disse algo que não disse).
- Mídia de post (`posts-midia`) é um bucket **privado** do Storage, não público — link direto adivinhável exporia foto de post de menor de idade pra quem tiver a URL. O app sempre lê via `createSignedUrl` (validade de 1h); a policy de `SELECT` em `storage.objects` restringe ao primeiro segmento do caminho (`turma_id`) do próprio usuário, com leitura cross-turma só pra professor/coordenacao da mesma escola.
- Foto de perfil (`perfil-fotos`) é o mesmo racional: bucket privado, caminho fixo `{user_id}/avatar.<ext>` (`upsert: true` — trocar a foto sobrescreve, não acumula arquivo órfão), leitura via `createSignedUrl` liberada pra quem já enxergaria o perfil da pessoa (mesma escola). `nome`/`foto_url`/`nome_usuario`/`bio` são as únicas colunas de `profiles` que o próprio dono pode `UPDATE` (GRANT restrito) — `papel`/`escola_id`/`turma_id` continuam fora do alcance do cliente pelas mesmas regras desde a Fase 1. Nome de usuário tem constraint de formato (`^[a-z0-9_]{3,20}$`) e é `unique` no banco — o app trata a violação de unicidade com uma mensagem amigável em vez de vazar o erro cru do Postgres.

## Limitações conhecidas

- **Modo escuro no preview web**: `useColorScheme()` (NativeWind) já lê a preferência do sistema corretamente — dá pra confirmar pelo header nativo, que muda de cor — mas, especificamente no target **web** desta versão do NativeWind/Expo, a classe `dark` não chega a ser aplicada no `<html>`, então as classes `dark:` do Tailwind ficam sem efeito visual só nesse target. iOS e Android (Expo Go/EAS, o target real do app) seguem o caminho documentado pela lib e não têm esse problema — vale reconfirmar num device/simulador real quando a Fase 1 tiver telas de verdade pra testar. Ver comentário em `app/_layout.tsx`.
- **Só 2 das 222 escolas do seed têm `latitude`/`longitude`** (Escola Secundária Pedro Nunes, Lisboa e Escola Secundária Dom Manuel Martins, Setúbal — geocodificadas à mão só pra validar o pipeline de clima de ponta a ponta). `aviso-clima` pula sozinha qualquer escola sem coordenada, então isso não quebra nada — só significa que o aviso automático de trajeto só funciona pra essas duas por enquanto. Geocodificar as outras 220 é trabalho futuro (dá pra automatizar com Nominatim/OSM, respeitando o limite de 1 req/s do serviço gratuito).
- **Push notification não dá pra testar no preview web**: `expo-notifications` não tem suporte completo no target web (o SDK avisa isso sozinho no console) e `Alert.alert` do React Native também não tem UI no web — o fluxo de logout e o pipeline de push foram verificados via chamada direta à API/Edge Function em vez de clique na tela. Ambos usam APIs padrão do React Native/Expo, então funcionam normalmente em iOS/Android — só não dá pra ver rodando neste preview.
- **`getExpoPushTokenAsync` precisa de `projectId`** (`extra.eas.projectId` no app config), que só existe depois de `eas init` — esse passo precisa de uma conta Expo de verdade (ver "Build via EAS e preparação pra loja" acima), então não dá pra rodar por aqui. Até lá, `registrarPushToken` roda sem erro mas não salva token nenhum (device sem projectId configurado).
- **Barra de abas flutuante pode tampar conteúdo colado na base da tela**: `tabBarStyle` é `position: absolute` (visual "flutuante" da Fase 6 — ver `(tabs)/_layout.tsx`), então qualquer tela dentro das 6 abas que gruda algo na base via flex (só `estudo.tsx` faz isso, a linha de enviar mensagem) precisa reservar o espaço da barra ou o toque no botão de baixo nem chega a ele. Corrigido duas vezes: primeiro com um `pb-24` fixo (achado testando o chat com a Gemini pela primeira vez no preview web), depois de vez com `src/lib/barraAbas.ts` (`useSafeAreaInsets`) depois que o usuário relatou a mesma barra tampando o campo de mensagem **no iPhone** — o valor fixo não somava o inset de segurança do aparelho (home indicator), então o que bastava no preview web não bastava num iPhone de verdade. Vale conferir de novo se alguma tela nova dentro de `(tabs)` grudar conteúdo na base — usar `useEspacoReservadoBarraAbas()`, não um `pb-*` chutado.

## Roadmap

- [x] **Fase 0 — Fundação**: projeto Expo + TypeScript, schema Supabase com RLS, lint/test/CI.
- [x] **Fase 1 — Conta e perfil**: cadastro/login (email+senha), onboarding de escola/turma, papel `aluno` por padrão.
- [x] **Fase 2 — Avisos e clima**: mural em tempo real, push via Edge Function, integração Open-Meteo, aviso automático de trajeto.
- [x] **Fase 3 — Estudo**: chat com IA por matéria (Gemini, `GEMINI_API_KEY` configurada e testada de ponta a ponta), calculadora de notas.
- [x] **Fase 4 — Feed da turma**: post, curtida, comentário, upload de imagem.
- [x] **Fase 5 — Chat comunitário**: salas em tempo real, moderação.
- [~] **Fase 6 — Acabamento**: linguagem visual (ícones, animações, cantos arredondados), auditoria de acessibilidade e config de build EAS/ícones/splash já feitas; falta só o que exige conta Expo/loja de verdade (`eas init`, build, submit — ver seção "Build via EAS e preparação pra loja").

### Pedido extra do usuário (fora da numeração original, completo)

Lista grande de funcionalidades estilo Instagram (perfil com seguidores, stories, mensagens diretas, busca global de usuário, feed em scroll contínuo, matérias editáveis, cadastro com busca de escola, filtro de palavrões) — organizada em sub-fases próprias, todas entregues:

- [x] **Fase 7 — Configurações**: tema (claro/escuro/sistema, persistido), privacidade da conta (público/privado — coluna gravada, aplicação de verdade na visibilidade entra junto da busca global na Fase 13), alterar e-mail (fluxo de confirmação do Supabase Auth) e alterar senha.
- [x] **Fase 8 — Matérias editáveis**: professor/coordenacao da escola cria, renomeia e apaga matéria da turma (`app/(app)/gerenciar-materias.tsx`, atrás do botão "Gerenciar matérias" no Perfil, só visível pra staff). Apagar é destrutivo (cascade em avaliações, histórico de chat com IA e a sala de chat da matéria) — o app confirma explicitamente antes.
- [x] **Fase 9 — Cadastro**: busca de escola com autocomplete, turma criável pelo próprio usuário com pedido de entrada aprovado pelo dono, e verificação de estudante (e-mail institucional por escola + número do cartão de estudante).
- [x] **Fase 10 — Perfil estilo Instagram**: bio, grid de posts, seguidores/seguindo (clicável), stories no topo do feed/perfil, editar turma no perfil.
- [x] **Fase 11 — Feed redesenhado**: avatar de verdade (clicável, leva pro perfil do autor), imagem "edge-to-edge", toque duplo pra curtir, pull-to-refresh.
- [x] **Fase 12 — Mensagens diretas**: pedidos, grupos/tópicos — **com bloqueio e denúncia desde o primeiro commit**, não como "depois". Decisão explícita do usuário foi abrir DM entre qualquer usuário do app (não só mesma escola) — dado que o público é majoritariamente menor de idade, isso só entra com as mesmas salvaguardas que Instagram/TikTok usam pra conta de menor: denunciar (reaproveita `denuncias`), bloquear, e staff/coordenação com visibilidade de conteúdo denunciado. Turma/grupo: só quem cria (dono) ou admins que ele nomear adicionam gente — sem entrada livre por busca.
- [x] **Fase 13 — Busca de usuários** (global, todas as escolas — decisão explícita do usuário).
- [x] **Fase 14 — Filtro de palavrões** (censura automática em post/comentário/mensagem — já estava no brief original seção 7, nunca implementado).

## Status atual

Correções + pedidos extra do usuário pós-Fase 14, testados de ponta a ponta contra o Supabase real:

- **Modo escuro no header**: o `Stack` raiz (`app/_layout.tsx`) nunca propaga `headerStyle`/`headerTintColor` pros navegadores filhos depois que eles cruzam `headerShown: false` — cada `Stack`/`Tabs` aninhado precisa da própria config. Faltava em `app/(app)/_layout.tsx` (todas as telas empilhadas) e `app/(app)/(tabs)/_layout.tsx` (as 6 abas principais), então o topo ficava branco mesmo com o app inteiro em modo escuro. Confirmado visualmente navegando com o tema em "escuro".
- **Story sem foto/vídeo**: dois bugs reais, não um só. Vídeo nunca tinha sido implementado (`escolherImagem` só aceitava imagem, de propósito, por comentário no código); e negar a permissão de câmera/galeria retornava `null` — exatamente igual a cancelar a seleção — então o botão parecia simplesmente não fazer nada quando a permissão era o problema de verdade. `escolherFotoOuVideo` (`src/features/feed/api.ts`) cobre os dois tipos de mídia agora (`expo-video`/`useVideoPlayer` pra reprodução, tanto na prévia de `nova-story.tsx` quanto na visualização em `story/[id].tsx`, com detecção de vídeo por extensão do arquivo — `ehVideo()` em `src/features/social/types.ts`, sem precisar de coluna nova) e nega-permissão agora lança erro com mensagem, capturado nos três pontos que chamam a escolha de mídia (post, story, foto de perfil).
- **Nome de usuário no cadastro**: campo novo, com checagem de disponibilidade (`nome_usuario_disponivel`, RPC `security definer` — precisa ser assim porque quem ainda não tem conta não pode consultar `profiles` pela RLS normal) antes de sequer chamar `auth.signUp`, pra não deixar ninguém preso com um e-mail confirmado e um nome de usuário rejeitado só depois.
- **Termos de Uso + consciência dos pais/responsáveis**: dois checkboxes **separados** de propósito (são consentimentos diferentes — aceitar os termos não é o mesmo que confirmar que um responsável sabe da conta) — texto simples, não é parecer jurídico, em `src/features/auth/termos.ts`. `termos_aceitos_em` grava com o relógio do **cliente** (`new Date().toISOString()`) porque é só um registro de consentimento, não uma janela de segurança tipo prazo de silenciamento — essa distinção (ver regra do `CLAUDE.md` sobre relógio do cliente vs. servidor) foi checada explicitamente antes de decidir que aqui era seguro.
- **Idade + repetência de ano**: campo de idade no cadastro; no onboarding (escolher/criar turma), se a idade não bater com o `serie_ano` da turma escolhida (tolerância de 1 ano pra não gerar falso positivo por data de aniversário — `idadeBateComSerie`, `src/features/onboarding/idadeEscolar.ts`, com teste unitário), aparece um card perguntando se o aluno repetiu de ano e quais anos, e **bloqueia** confirmar/criar turma/pedir entrada até responder. Gravado em `anos_reprovados` (`smallint[]`).
- Testado no browser com conta real: cadastro completo (nome de usuário, idade, os dois checkboxes), confirmação de e-mail, login, escolha de turma de ano incompatível com a idade informada (card de repetência aparece e bloqueia o pedido de entrada até responder), resposta "sim, repeti" com anos selecionados confirmada gravada no banco (`anos_reprovados`), e nome de usuário duplicado barrado com mensagem amigável **antes** de qualquer chamada de cadastro (sem usuário órfão criado no Auth).
- **Aviso de cookies + "adicionar à tela inicial"** (web only): banner de cookies explica o uso de armazenamento local (sessão + preferência de tema, sem rastreamento) e persiste a escolha; prompt de instalação captura o `beforeinstallprompt` do Chrome/Edge/Android pra oferecer botão "Instalar" de verdade, com instrução manual pro iOS/Safari (que não tem essa API). `public/manifest.json` + ícones fazem o navegador saber nome/ícone/cor ao instalar. Descoberta no processo: `app/+html.tsx` (o jeito documentado do Expo Router de customizar o HTML raiz) só tem efeito com `web.output: "static"`/`"server"` — testado contra o export real e confirmado que não fazia diferença nenhuma no `web.output: "single"` (SPA) que este projeto usa; em vez de trocar de modo (o que exigiria `generateStaticParams` pras rotas dinâmicas e mudaria o rewrite do `vercel.json`), um script pequeno (`scripts/injetar-tags-pwa.js`) pós-processa o `dist/index.html` do export, encadeado no `buildCommand` do Vercel.
- **Aluno pode adicionar matéria da própria turma**: Fase 8 restringia isso a staff; agora qualquer aluno adiciona matéria da própria turma (`materias_insert_aluno`, RLS — soma com a policy de staff via OR, sem checar papel, só que seja da própria turma). Renomear e apagar continuam staff-only (apagar é destrutivo pra turma inteira: cascade em avaliações, chat com IA e a sala de chat da matéria). `app/(app)/gerenciar-materias.tsx` esconde os botões de renomear/apagar quando quem está vendo não é staff; testado com conta de aluno real (matéria criada, sala de chat automática confirmada) e tentativa de apagar/renomear matéria de outro autor **direto via API HTTP** barrada pela RLS (0 linhas afetadas, matéria intacta).
- **Chat de estudo trocado de Claude (Anthropic) pra Gemini (Google)**: `supabase/functions/chat-estudo/index.ts` reescrita pra chamar `generateContent` da Gemini em vez da Messages API da Anthropic — formato de request/response bem diferente (`contents`/`parts` com `role: 'user'|'model'`, não `messages`/`content` com `role: 'user'|'assistant'`; prompt de sistema vai em `systemInstruction` separado, não misturado nas mensagens). `escolherModelo` agora sempre retorna `gemini-flash-latest` — a escalada de modelo por complexidade (resumo/plano num modelo mais caro) que o brief original pedia pro Claude não foi reativada pra Gemini porque só esse id de modelo foi confirmado de verdade (testado pelo usuário com a própria chave); um id "pro" chutado sem confirmar quebraria silenciosamente esses dois modos (ver comentário em `supabase/functions/_shared/regrasEstudo.ts`). Testado de ponta a ponta com conta real: pergunta respondida corretamente em português, e um turno seguinte perguntando "qual foi minha pergunta anterior" confirmou que o histórico da conversa (`chat_ia_mensagens`) está sendo repassado certo pro próximo turno.
- **Bug real pego no meio desse teste**: o botão "Enviar" do chat de estudo não reagia a clique nenhum — a barra de abas flutuante (`position: absolute`, Fase 6) estava fisicamente por cima dele, e o clique nunca chegava ao botão. `estudo.tsx` é a única das 6 abas com conteúdo colado na base da tela via flex; corrigido reservando o espaço da barra (`pb-24` em vez do `pb-6` padrão) — ver "Limitações conhecidas".

Fase 14 (Filtro de palavrões) completa — **última fase do roadmap estendido**, testada de ponta a ponta contra o Supabase real. A censura roda num trigger `BEFORE INSERT OR UPDATE` (`private.censurar_texto` + `private.aplicar_censura`) nas quatro tabelas com texto livre de usuário: `posts`, `post_comentarios`, `mensagens_chat`, `mensagens_diretas` — decisão de arquitetura deliberada: um filtro só no cliente (JS) é decorativo, porque uma requisição direta pra API passaria reto (é exatamente o tipo de coisa que foi testado neste projeto inteiro pra validar RLS); rodando no banco, não tem como contornar sem burlar a própria RLS. Lista curta de palavrões óbvios em PT-PT (sem gírias regionais nem leetspeak — o "comece simples" que o brief pediu), substituição por asteriscos do mesmo tamanho, fronteira de palavra (`\y` no Postgres) pra não gerar falso positivo (ex.: "Curitiba" não vira "**itiba"). Existe também uma cópia em TypeScript (`src/lib/filtroPalavroes.ts`, com testes) — não usada na UI (a censura de verdade é só a do banco), mas mantém a mesma lista documentada e testada num lugar de fácil leitura.

Testado com conta real: postar um texto com dois palavrões mostra a versão censurada no feed sem nenhuma mudança de código no app (a mutation já invalida e reconsulta, e a linha que volta do banco já vem censurada pelo trigger); e — o teste que importa de verdade — inserir uma mensagem direta **direto via API HTTP**, sem passar pela UI nenhuma, ainda assim volta censurada na resposta, confirmando que não dá pra contornar mandando requisição crua.

Fase 13 (Busca de usuários) completa e testada de ponta a ponta contra o Supabase real. Sem tabela nem RLS nova — a régua de quem aparece pra quem já existe desde a Fase 10 (`profiles_select`: perfil público, mesma turma/escola, staff, ou o próprio), então essa busca (`buscarUsuarios`, `ilike` em `nome`/`nome_usuario`) só dá uma forma de _descobrir_ gente, não abre visibilidade nova nenhuma. Tela nova `app/(app)/buscar-usuarios.tsx` (ícone de lupa no cabeçalho do Feed + botão "Pesquisar usuários" no Perfil), e o seletor de "Nova conversa" (Fase 12) passou a combinar a lista de quem eu sigo/me segue com a busca global (2+ letras), então agora dá pra iniciar conversa com qualquer um do app diretamente de lá também — antes só dava pra conversar com quem já tinha alguma relação existente.

Testado com conta real: buscar "Prof" encontra um usuário de papel/turma diferente da minha (só aparece por causa da regra de perfil público, confirmando que a busca respeita a mesma RLS de sempre), tocar no resultado abre o perfil dele, e o mesmo termo digitado em "Nova conversa" traz o mesmo resultado misturado com a lista de contatos.

Fase 12 (Mensagens diretas) completa e testada de ponta a ponta contra o Supabase real — a fase mais sensível até aqui, dado o público majoritariamente menor de idade, então as salvaguardas vieram no mesmo commit que a feature, não depois.

Modelo de dados: `conversas` (`tipo` direta/grupo), `conversas_participantes` (papel membro/admin, `pedido_aceito`), `mensagens_diretas` (soft delete via `apagada`, igual `mensagens_chat`), `bloqueios` (par bloqueador/bloqueado). Três RPCs `security definer` fazem a escrita que importa: `criar_conversa_direta` (reaproveita conversa existente entre os dois, ou cria uma nova — pedido começa aceito se o destinatário já me segue, senão fica pendente só pro lado dele: é a fila de "Pedidos", igual solicitação de mensagem do Instagram), `criar_conversa_grupo` (quem cria vira admin) e `adicionar_participante_grupo` (só admin/dono, validado dentro da função — não só escondido na UI). Um trigger (`aceitar_pedido_ao_responder`) aceita o pedido sozinho assim que o destinatário responde, sem precisar apertar "Aceitar" antes.

UI: aba "Mensagens" dentro de Chat (`app/(app)/(tabs)/chat.tsx`, ao lado de "Salas" — sem mexer na barra de navegação inferior, como o usuário confirmou que já estava certa), com sub-abas Conversas/Pedidos; `app/(app)/conversa/[id].tsx` é a tela de thread (realtime, aceitar/recusar pedido, denunciar mensagem, apagar a própria); `app/(app)/nova-conversa.tsx` escolhe a pessoa (ou monta um grupo) a partir de quem eu sigo/me segue — sem busca global de usuário ainda (isso é a Fase 13), então a lista vem só de relações que já existem; `app/(app)/grupo-participantes/[id].tsx` mostra membros e deixa admin adicionar gente. Perfil de outra pessoa (Fase 10) ganhou botões de "Mensagem" e "Bloquear/Desbloquear".

**Staff com visibilidade de conteúdo denunciado** — gap real do brief original (seção 7 prometia a fila desde a Fase 4, nunca teve tela): `app/(app)/moderacao-denuncias.tsx` lista denúncias por status (pendente/revisado/resolvido) pra professor/coordenação da escola, com o texto do conteúdo denunciado (post, comentário, mensagem de sala ou mensagem direta) buscado por tipo. RLS de `mensagens_diretas` libera pra staff _só_ a mensagem específica que tem uma denúncia apontando pra ela — nunca a conversa inteira, ao contrário do que já vale pra `mensagens_chat` (espaço coletivo de turma, staff sempre viu tudo): DM é 1-a-1 de verdade, então a visibilidade fica estritamente no que foi denunciado.

Dois bugs de RLS pegos só rodando de ponta a ponta (não apareciam no `typecheck`/lint): (1) a policy de select de `conversas_participantes` fazia subquery na própria tabela ("outro participante da mesma conversa também pode ver") — Postgres reavalia a RLS da subquery, que reavalia nela mesma, num ciclo sem fim ("infinite recursion detected in policy"). Corrigido com uma função `security definer` (`private.sou_participante`) que quebra o ciclo rodando com bypass de RLS por dentro. (2) mais sério: o bloqueio não bloqueava de verdade — a policy de insert de `mensagens_diretas` fazia `join bloqueios` direto, mas a RLS de `bloqueios` só libera ver o bloqueio que EU criei (de propósito, pra não vazar "fulano me bloqueou"); então quem tinha sido bloqueado continuava enxergando "nenhum bloqueio" do próprio ponto de vista e conseguia mandar mensagem mesmo assim. Corrigido com outra função `security definer` (`private.existe_bloqueio_entre`) que checa os dois sentidos ignorando RLS. Os dois só foram descobertos testando com requisições HTTP reais entre duas contas — nenhum teste de unidade pegaria isso.

Testado com três contas reais: pedido de mensagem pendente quando o destinatário não segue de volta (`Pedidos (1)` na aba), aceitar move pra "Conversas" e libera o composer, mensagem depois de bloqueado é rejeitada (403, verificado via HTTP direto, não só escondido na UI), criar conversa com quem está bloqueado é recusado pelo RPC, grupo criado com dono admin + membro, tentativa de adicionar participante por não-admin rejeitada pelo RPC (não só pela UI), e a tela de moderação mostrando corretamente denúncias de posts, comentários, mensagem de sala e mensagem direta lado a lado — incluindo denúncias antigas de fases anteriores que nunca tinham tido uma tela pra serem revisadas.

Fase 11 (Feed redesenhado) completa e testada de ponta a ponta contra o Supabase real. Cada card (`CartaoPost`) agora mostra o avatar de verdade do autor (`FotoPerfil`, não mais um ícone genérico) — tocar no avatar ou no nome leva pro perfil dele (o próprio, ou `perfil/[id]` de outra pessoa, reusando a navegação da Fase 10; a consulta de posts (`listarPosts`/`listarPostsDoAutor`/`buscarPost`) passou a trazer `profiles(id, nome, foto_url)` em vez de só `nome`). Imagem do post ficou "edge-to-edge" dentro do card (sem cantos arredondados nem borda — o card em si já é arredondado e teria clipado errado; a imagem some entre o cabeçalho e o rodapé, então nunca toca as bordas curvas). Toque duplo na imagem curte, com um coraçãozinho que aparece e some sozinho (`Animated.View` + `useSharedValue`/`withSequence` do Reanimated, detecção de "duplo toque" por diferença de timestamp — sem lib nova) — desligado quando o sistema pede "reduzir movimento" (a curtida em si continua funcionando, só sem o efeito). Pull-to-refresh no `FlatList` do feed (`RefreshControl`, ligado ao `isRefetching` do TanStack Query). `app/(app)/post/[id].tsx` ganhou o mesmo avatar clicável no cabeçalho, pra manter consistência com o card do feed.

Testado com conta real: post de texto aparece no feed com avatar (iniciais, já que a conta de teste não tem foto), curtir incrementa o contador, tocar no nome/avatar leva pro próprio perfil (mostrando a publicação na grid, coerente com a Fase 10), e o detalhe do post (`post/[id].tsx`) mostra o mesmo cabeçalho consistente.

Fase 10 (Perfil estilo Instagram) completa e testada de ponta a ponta contra o Supabase real. Seguidores/seguindo: tabela `seguidores` (RLS aberta pra leitura — mesma régua do perfil público, escrita só pelo próprio), contadores clicáveis no cabeçalho do perfil levam pra `app/(app)/conexoes/[id].tsx` (lista, com `tipo=seguidores|seguindo` na rota). Grid de posts (`GridPosts`, 3 colunas, miniatura com URL assinada ou ícone+texto pra post sem foto) reusa `listarPostsDoAutor` que já existia. Stories: tabela `stories` com `expira_em` (24h, calculado no banco), bucket privado `stories-midia` path por `autor_id`; `StoriesBar` no topo do feed e do perfil agrupa por autor (bolinha com anel quando tem story ativa, "+" quando é a sua e ainda não tem nenhuma), `app/(app)/nova-story.tsx` publica (upload + insert) e `app/(app)/story/[id].tsx` (`id` = autor, não a story individual) mostra em sequência com toque esquerda/direita pra navegar — sem temporizador automático, MVP simples documentado como limitação conhecida. "Editar a turma" (pedido do usuário): o formulário de escola+turma+verificação do onboarding foi extraído pra `EscolaTurmaForm` (reusado, não duplicado) e ganhou uma segunda tela, `app/(app)/trocar-turma.tsx`, acessível por um botão em "Editar perfil".

**Perfil público de verdade** (Fase 9 só gravava a preferência): `profiles_select` e `posts_select` ganharam uma cláusula `publico = true` — a partir de agora, marcar o perfil como público de fato libera ver o perfil (e o grid de posts _desse_ perfil, especificamente) pra qualquer usuário do app, de qualquer escola, exatamente como o usuário pediu explicitamente nas Fases 7-9. Isso é diferente de "vazar posts pro feed de outra turma" — o feed continua filtrando por `turma_id` explicitamente na consulta do app, então só o _perfil_ de alguém público fica mais aberto, não o feed de ninguém.

Testado com três contas reais: seguir/deixar de seguir (contador atualiza, botão troca), lista de seguidores navegando de volta pro perfil de quem já é o próprio usuário logado (`Redirect` pra `/perfil` em vez de duplicar a tela), perfil público visível entre turmas diferentes da mesma escola (antes bloqueado pela RLS antiga), "Trocar de turma" pré-preenchido com a escola atual, salvando e voltando (turma + cartão de estudante gravados, verificado via SQL), e a bolinha de story mudando de "+" pra anel quando existe uma ativa, abrindo o visualizador em tela cheia com barra de progresso, nome do autor e fechar funcionando.

Fase 9 (Cadastro — busca de escola + turma criável) completa e testada de ponta a ponta contra o Supabase real, com três contas de teste: busca de escola por nome (filtro client-side, resultado capado em 30 com aviso de "refine a busca"), criação de turma nova (`turmas.criado_por` grava o dono; RLS `turmas_insert` exige `criado_por = auth.uid()`), ícone de cadeado nas turmas criadas por usuário na lista de onboarding, pedido de entrada (`turma_pedidos_entrada`, índice único parcial permitindo repedir depois de recusado) com UI de pendente/atualizar, aprovação e recusa pelo dono (`app/(app)/pedidos-turma.tsx`, RPC `responder_pedido_entrada_turma`), e o fluxo institucional (turma semeada, `criado_por is null`) confirmado sem mudança nenhuma — entrada direta, sem pedido. RLS do RPC testada diretamente via chamada HTTP (não só escondida na UI): usuário que não é dono da turma toma o erro esperado ("Só o dono da turma... pode responder esse pedido") e o pedido não muda de estado.

Dois bugs pegos e corrigidos só durante esse teste de ponta a ponta (não apareciam no `typecheck`/lint, só rodando de verdade): (1) o `update` da função `responder_pedido_entrada_turma` comparava `status` (enum `status_pedido_turma`) contra uma expressão `text` sem cast — Postgres recusava com "column is of type status_pedido_turma but expression is of type text", e a aprovação/recusa nunca gravava; (2) aprovar um pedido só atualizava `profiles.turma_id`, esquecendo `profiles.escola_id` — quem entrava por pedido ficava com turma nova mas sem escola, quebrando qualquer RLS que dependa de `private.current_escola_id()`. Um terceiro problema, de UX: a política `profiles_select` (RLS) só libera ver o perfil de alguém da mesma turma ou staff da mesma escola — mas quem _pediu_ entrada ainda não tem `turma_id` nenhum (só ganha depois de aprovado), então o dono da turma nunca conseguia ver o nome de quem pediu (a UI caía no fallback "Alguém"). Corrigido com uma policy adicional (`profiles_select_pedido_pendente`) liberando só o necessário: o perfil de quem tem pedido _pendente_ numa turma que o usuário logado criou.

Verificação de estudante no cadastro (Fase 9, parte 2 — decisão tomada com o usuário: e-mail institucional + número do cartão de estudante). `escolas.dominio_email` fica `null` até alguém preencher manualmente pra cada escola (Supabase Studio — sem painel de admin, como já é o padrão neste projeto); quando preenchido, a tela de onboarding bloqueia a escolha dessa escola se o e-mail cadastrado do usuário não terminar em `@dominio_email`, com mensagem explicando o motivo. `profiles.numero_cartao_estudante` é obrigatório antes de confirmar entrada institucional, criar turma ou pedir entrada — gravado já no momento do pedido (não só depois de aprovado), porque quem pede ainda não tem `escola_id`/`turma_id`. **Limitação documentada de propósito**: nenhum dos dois dado é verificável de verdade sem integração com o sistema oficial da escola (fora do escopo do MVP) — funciona como barreira de entrada, não como prova de identidade. Testado no browser: escola com domínio configurado bloqueia e-mail de fora do domínio (sem gravar nada), escola sem domínio configurado libera normal, e confirmar sem preencher o cartão mostra erro em vez de prosseguir. Um bug pego no teste: a coluna nova precisava de `grant update (numero_cartao_estudante) on public.profiles to authenticated` explícito (mesmo padrão das migrations anteriores de perfil) — sem isso a escrita voltava 403 "permission denied for table profiles", mesmo com a RLS certa.

Fase 7 (Configurações) completa e testada no browser: troca de tema grava e aplica (`nativewind`'s `setColorScheme` + persistência em `AsyncStorage`, aplicado de novo no boot do app), toggle de privacidade grava no banco, formulário de troca de senha valida (senhas diferentes barradas antes de qualquer chamada à API) sem arriscar a senha da conta de teste.

Perfil editável (pedido extra do usuário, fora da numeração de fases original): nome, nome de usuário (`@handle`, único, formato validado), bio (280 caracteres) e foto (upload real pro Storage privado `perfil-fotos`, com URL assinada) — tela `editar-perfil.tsx`, acessível pelo botão "Editar perfil" no perfil. "Minhas publicações" (`minhas-publicacoes.tsx`) reusa o card do feed (`CartaoPost`, extraído pra `src/features/feed/CartaoPost.tsx`) filtrado pelo próprio autor. Testado de ponta a ponta contra o Supabase real: upload de foto, edição de nome/bio, e o caso de erro de nome de usuário duplicado (mensagem amigável em vez do erro cru do Postgres).

Fase 6 em andamento: `eas.json` configurado (perfis `development`/`preview`/`production`), ícone e splash screen próprios gerados (`assets/icon.png` e afins — ver "Identidade visual"), `expo-splash-screen`/`expo-font` instalados e configurados, dependências alinhadas com o SDK (`npx expo-doctor` de 18/21 pra 20/21 checks — o 1 restante é um falso positivo conhecido do schema do `expo-doctor` com `newArchEnabled`, não bloqueia build). Auditoria de acessibilidade: campos de formulário (`TextField`) agora repetem o label (+ erro, se houver) em `accessibilityLabel` — sem isso um leitor de tela não tinha como saber o propósito do campo, já que React Native não associa `<Text>` a `<TextInput>` sozinho; todo `Pressable` do app já tinha `accessibilityRole`/`accessibilityLabel` desde as fases anteriores. Falta o que só dá pra fazer com uma conta Expo/loja de verdade: `eas init` (gera o `projectId`, resolve também a limitação de push notification abaixo), primeiro build via `eas build`, e submissão nas lojas.

Redesign visual aplicado em todo o app (todas as telas de `(auth)`, `(onboarding)` e `(app)`, mais os componentes base em `src/components/ui/`): botões-pílula com ícone e leve encolher no toque, campos com ícone, cards com sombra suave e cantos bem arredondados, barra de abas flutuante com ícone por aba, e listas com entrada em cascata (fade+slide) — tudo desligado quando o sistema pede "reduzir movimento". Paleta de cores mantida (decisão do usuário). Verificado visualmente no browser contra o app rodando de verdade (login, feed, chat com duas contas, notas, perfil), sem erro novo no console.

Fase 5 completa e testada de ponta a ponta contra o projeto Supabase real, com duas contas simultâneas (aluno + professor): sala de turma e de matéria nascem sozinhas (trigger), sala de assunto criada pelo aluno, mensagem em tempo real via Supabase Realtime (inserida por um usuário aparece no outro sem refresh), apagar mensagem (soft delete, só staff), silenciar usuário (1h/24h, prazo calculado no servidor) e trancar/destrancar sala (só staff) — RLS testada diretamente (insert de mensagem silenciada/em sala trancada é rejeitado pelo banco, não só escondido na UI). Fase 4 (feed) e Fase 3 (notas/chat IA) seguem como antes.

### Dados de exemplo

[`supabase/seed.sql`](supabase/seed.sql) popula **222 escolas reais dos distritos de Lisboa e Setúbal** (agrupamentos de escolas e escolas não agrupadas, fonte: rede DGAE/ME 2025/2026), cada uma com uma turma por ano do **5º ao 12º ano** (1776 turmas no total) — é o que a lista de onboarding mostra. Gerenciar escola/turma continua responsabilidade do Studio (ver seção "Fora do escopo" do brief); esse arquivo só evita começar com a lista vazia. A Supabase CLI roda esse arquivo sozinha depois das migrations em `supabase db reset`.
