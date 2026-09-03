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
| IA de estudo      | API da Anthropic, chamada só por Edge Function                   |
| Previsão do tempo | Open-Meteo                                                       |
| Testes            | Jest + jest-expo + React Native Testing Library                  |

**Regra de ouro:** nenhuma chave de API (Anthropic, service role do Supabase) fica no app. Tudo que precisa de segredo passa por uma Edge Function.

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
| `ANTHROPIC_API_KEY`             | Edge Function (`supabase secrets set`)           | **Sim** — nunca no app                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Edge Function (`supabase secrets set`)           | **Sim** — nunca no app                                  |
| `EXPO_ACCESS_TOKEN`             | Edge Function, se usar envio de push autenticado | **Sim** — nunca no app                                  |

As duas últimas linhas da tabela são secrets de Edge Function, não variáveis do app — não existe `.env` pra elas neste repo; são configuradas direto no projeto Supabase (`supabase secrets set NOME=valor`).

### Edge Functions e automações

| Nome              | Disparo                                                               | O que faz                                                                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notificar-aviso` | Trigger `AFTER INSERT` em `avisos` (`private.notificar_aviso_criado`) | Lê `push_token` de quem tem direito ao aviso (escopo escola/turma, só `aluno` — ver `supabase/functions/_shared/regras.ts`) e manda pro Expo Push Service.                                                                                                                       |
| `aviso-clima`     | `pg_cron`, a cada 4h (`aviso-clima-periodico`)                        | Pra cada escola com `latitude`/`longitude` cadastrada, consulta o Open-Meteo e cria um aviso `tipo='trajeto'` quando a previsão passa o limite configurável daquela escola. O INSERT aciona sozinho o trigger acima.                                                             |
| `chat-estudo`     | Chamada direta do app (`supabase.functions.invoke`)                   | Recebe matéria + mensagem + modo (explicar/dúvida/resumo/plano), monta o histórico da conversa (`chat_ia_mensagens`, só leitura pro cliente) e o prompt de tutor (`supabase/functions/_shared/regrasEstudo.ts`), chama a Anthropic e grava as duas mensagens com a service role. |

`notificar-aviso`/`aviso-clima` têm `verify_jwt` ligado e autenticam com a chave anon do projeto (pública, a mesma do `.env`) — chamadas servidor-a-servidor (trigger/cron), sem CORS envolvido. `chat-estudo` **é** chamada direto do navegador/app, então precisa responder o preflight `OPTIONS` com os headers de CORS certos — sem isso o request nem sai do cliente (achado testando de verdade: ver `supabase/functions/chat-estudo/index.ts`). Todas usam a `SUPABASE_SERVICE_ROLE_KEY` que o runtime já injeta sozinho pra ler/escrever ignorando RLS quando precisam — não precisou gerenciar segredo próprio via `supabase secrets set` pra isso.

**`chat-estudo` exige `ANTHROPIC_API_KEY`** como secret da função (`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`, ou Studio → Edge Functions → Secrets) — sem isso ela responde 503 com uma mensagem clara em vez de quebrar (é o estado atual: a função e o app estão prontos, só falta essa chave ser configurada por quem tem acesso a ela).

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
2. Nas variáveis de ambiente do projeto na Vercel, adicione `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (os mesmos valores do seu `.env` local — são públicas, protegidas por RLS, não segredo de verdade, mas o build não funciona sem elas). **Nunca** adicione `ANTHROPIC_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` aqui — essas só existem como secret de Edge Function, nunca no bundle do app (ver "Segurança e privacidade").
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
    chat-estudo/      # Chat com IA por matéria (precisa de ANTHROPIC_API_KEY)
    aviso-clima/      # Cron: cria aviso automático de trajeto via Open-Meteo
```

## Segurança e privacidade

O público é majoritariamente menor de idade — isto é requisito de MVP, não um item de "fase 2":

- Toda tabela sensível tem Row Level Security habilitada desde a primeira migration, com policies por papel (`aluno` / `professor` / `coordenacao`) e por escopo (escola/turma) — não é um filtro só no app.
- `papel` do próprio perfil nunca é editável pelo usuário — só por quem administra o banco (Studio/SQL) — o que evita autopromoção pra professor/coordenacao. No cadastro, todo mundo entra como `aluno`; `escola_id`/`turma_id` **são** editáveis pelo próprio usuário (é o que o onboarding da Fase 1 grava).
- Silenciar um usuário (`profiles.silenciado_ate`) só pode ser feito por professor/coordenacao — reforçado por um trigger no banco, não só pela regra do app. O prazo (1h/24h) é calculado no banco (`silenciar_usuario`, `now() + interval`), não no cliente — um relógio de dispositivo errado não pode gravar um prazo que já nasce expirado.
- Mensagem apagada por moderação é soft-delete (`mensagens_chat.apagada`) e some da lista de quem não é staff já na policy de `SELECT` (não é só escondida na UI); excluir a própria conta (Fase 1) deve apagar de fato o histórico de mensagens do usuário via `ON DELETE CASCADE`.
- Não existe sala de chat 1-a-1 aluno-aluno — toda sala é de turma, matéria ou assunto, sempre supervisionável por professor/coordenacao. Sala de turma/matéria nasce sozinha (trigger) quando a turma/matéria é criada; só sala de assunto é criada pelo aluno, e trancar/destrancar é ação exclusiva de staff.
- Nenhuma chave de API sensível (Anthropic, service role) chega ao bundle do app — variável sem prefixo `EXPO_PUBLIC_` não é visível no cliente e vive só como secret de Edge Function.
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
- **`chat-estudo` sem `ANTHROPIC_API_KEY` configurada** — responde 503 com uma mensagem clara ("Chat com IA ainda não foi configurado") em vez de dar resposta de IA de verdade. Configure o secret (ver seção "Edge Functions e automações") pra testar a conversa de ponta a ponta.

## Roadmap

- [x] **Fase 0 — Fundação**: projeto Expo + TypeScript, schema Supabase com RLS, lint/test/CI.
- [x] **Fase 1 — Conta e perfil**: cadastro/login (email+senha), onboarding de escola/turma, papel `aluno` por padrão.
- [x] **Fase 2 — Avisos e clima**: mural em tempo real, push via Edge Function, integração Open-Meteo, aviso automático de trajeto.
- [x] **Fase 3 — Estudo**: chat com IA por matéria (aguardando secret `ANTHROPIC_API_KEY`), calculadora de notas.
- [x] **Fase 4 — Feed da turma**: post, curtida, comentário, upload de imagem.
- [x] **Fase 5 — Chat comunitário**: salas em tempo real, moderação.
- [~] **Fase 6 — Acabamento**: linguagem visual (ícones, animações, cantos arredondados), auditoria de acessibilidade e config de build EAS/ícones/splash já feitas; falta só o que exige conta Expo/loja de verdade (`eas init`, build, submit — ver seção "Build via EAS e preparação pra loja").

### Pedido extra do usuário (fora da numeração original, em andamento)

Lista grande de funcionalidades estilo Instagram (perfil com seguidores, stories, mensagens diretas, busca global de usuário, feed em scroll contínuo, matérias editáveis, cadastro com busca de escola, filtro de palavrões) — organizada em sub-fases próprias:

- [x] **Fase 7 — Configurações**: tema (claro/escuro/sistema, persistido), privacidade da conta (público/privado — coluna gravada, aplicação de verdade na visibilidade entra junto da busca global na Fase 13), alterar e-mail (fluxo de confirmação do Supabase Auth) e alterar senha.
- [x] **Fase 8 — Matérias editáveis**: professor/coordenacao da escola cria, renomeia e apaga matéria da turma (`app/(app)/gerenciar-materias.tsx`, atrás do botão "Gerenciar matérias" no Perfil, só visível pra staff). Apagar é destrutivo (cascade em avaliações, histórico de chat com IA e a sala de chat da matéria) — o app confirma explicitamente antes.
- [ ] **Fase 9 — Cadastro**: busca de escola com autocomplete, verificação de estudante.
- [ ] **Fase 10 — Perfil estilo Instagram**: bio, grid de posts, seguidores, stories.
- [ ] **Fase 11 — Feed redesenhado** (scroll contínuo estilo Instagram/Twitter).
- [ ] **Fase 12 — Mensagens diretas**: pedidos, grupos/tópicos — **com bloqueio e denúncia desde o primeiro commit**, não como "depois". Decisão explícita do usuário foi abrir DM entre qualquer usuário do app (não só mesma escola) — dado que o público é majoritariamente menor de idade, isso só entra com as mesmas salvaguardas que Instagram/TikTok usam pra conta de menor: denunciar (reaproveita `denuncias`), bloquear, e staff/coordenação com visibilidade de conteúdo denunciado. Turma/grupo: só quem cria (dono) ou admins que ele nomear adicionam gente — sem entrada livre por busca.
- [ ] **Fase 13 — Busca de usuários** (global, todas as escolas — decisão explícita do usuário).
- [ ] **Fase 14 — Filtro de palavrões** (censura automática em post/comentário/mensagem — já estava no brief original seção 7, nunca implementado).

## Status atual

Fase 7 (Configurações) completa e testada no browser: troca de tema grava e aplica (`nativewind`'s `setColorScheme` + persistência em `AsyncStorage`, aplicado de novo no boot do app), toggle de privacidade grava no banco, formulário de troca de senha valida (senhas diferentes barradas antes de qualquer chamada à API) sem arriscar a senha da conta de teste.

Perfil editável (pedido extra do usuário, fora da numeração de fases original): nome, nome de usuário (`@handle`, único, formato validado), bio (280 caracteres) e foto (upload real pro Storage privado `perfil-fotos`, com URL assinada) — tela `editar-perfil.tsx`, acessível pelo botão "Editar perfil" no perfil. "Minhas publicações" (`minhas-publicacoes.tsx`) reusa o card do feed (`CartaoPost`, extraído pra `src/features/feed/CartaoPost.tsx`) filtrado pelo próprio autor. Testado de ponta a ponta contra o Supabase real: upload de foto, edição de nome/bio, e o caso de erro de nome de usuário duplicado (mensagem amigável em vez do erro cru do Postgres).

Fase 6 em andamento: `eas.json` configurado (perfis `development`/`preview`/`production`), ícone e splash screen próprios gerados (`assets/icon.png` e afins — ver "Identidade visual"), `expo-splash-screen`/`expo-font` instalados e configurados, dependências alinhadas com o SDK (`npx expo-doctor` de 18/21 pra 20/21 checks — o 1 restante é um falso positivo conhecido do schema do `expo-doctor` com `newArchEnabled`, não bloqueia build). Auditoria de acessibilidade: campos de formulário (`TextField`) agora repetem o label (+ erro, se houver) em `accessibilityLabel` — sem isso um leitor de tela não tinha como saber o propósito do campo, já que React Native não associa `<Text>` a `<TextInput>` sozinho; todo `Pressable` do app já tinha `accessibilityRole`/`accessibilityLabel` desde as fases anteriores. Falta o que só dá pra fazer com uma conta Expo/loja de verdade: `eas init` (gera o `projectId`, resolve também a limitação de push notification abaixo), primeiro build via `eas build`, e submissão nas lojas.

Redesign visual aplicado em todo o app (todas as telas de `(auth)`, `(onboarding)` e `(app)`, mais os componentes base em `src/components/ui/`): botões-pílula com ícone e leve encolher no toque, campos com ícone, cards com sombra suave e cantos bem arredondados, barra de abas flutuante com ícone por aba, e listas com entrada em cascata (fade+slide) — tudo desligado quando o sistema pede "reduzir movimento". Paleta de cores mantida (decisão do usuário). Verificado visualmente no browser contra o app rodando de verdade (login, feed, chat com duas contas, notas, perfil), sem erro novo no console.

Fase 5 completa e testada de ponta a ponta contra o projeto Supabase real, com duas contas simultâneas (aluno + professor): sala de turma e de matéria nascem sozinhas (trigger), sala de assunto criada pelo aluno, mensagem em tempo real via Supabase Realtime (inserida por um usuário aparece no outro sem refresh), apagar mensagem (soft delete, só staff), silenciar usuário (1h/24h, prazo calculado no servidor) e trancar/destrancar sala (só staff) — RLS testada diretamente (insert de mensagem silenciada/em sala trancada é rejeitado pelo banco, não só escondido na UI). Fase 4 (feed) e Fase 3 (notas/chat IA) seguem como antes.

### Dados de exemplo

[`supabase/seed.sql`](supabase/seed.sql) popula **222 escolas reais dos distritos de Lisboa e Setúbal** (agrupamentos de escolas e escolas não agrupadas, fonte: rede DGAE/ME 2025/2026), cada uma com uma turma por ano do **5º ao 12º ano** (1776 turmas no total) — é o que a lista de onboarding mostra. Gerenciar escola/turma continua responsabilidade do Studio (ver seção "Fora do escopo" do brief); esse arquivo só evita começar com a lista vazia. A Supabase CLI roda esse arquivo sozinha depois das migrations em `supabase db reset`.
