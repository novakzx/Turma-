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

## Estrutura de pastas

```
app/
  _layout.tsx         # Stack.Protected: escolhe (auth)/(onboarding)/(app) por sessão+perfil
  (auth)/             # Login (index) e cadastro — grupo ativo sem sessão
  (onboarding)/       # Escolha de escola/turma — grupo ativo com sessão incompleta
  (app)/              # Área logada — grupo ativo com onboarding completo
    (tabs)/           # Avisos, Feed, Estudo, Notas, Perfil
    novo-aviso.tsx    # Modal — só professor/coordenacao chega aqui de verdade (RLS + UI)
    novo-post.tsx     # Modal — criar post (texto/foto/evento/lembrete) na turma
    post/[id].tsx     # Detalhe do post: comentários, denúncia, apagar (autor/staff)
src/
  features/           # Uma pasta por domínio: auth, onboarding, perfil, avisos, notificacoes, notas, estudo, feed (chat comunitário vem na próxima fase)
  components/ui/      # Componentes visuais reutilizáveis, sem regra de negócio
  lib/                # Supabase client, TanStack Query client, global.css
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
- Silenciar um usuário (`profiles.silenciado_ate`) só pode ser feito por professor/coordenacao — reforçado por um trigger no banco, não só pela regra do app.
- Mensagem apagada por moderação é soft-delete (`mensagens_chat.apagada`); excluir a própria conta (Fase 1) deve apagar de fato o histórico de mensagens do usuário via `ON DELETE CASCADE`.
- Não existe sala de chat 1-a-1 aluno-aluno — toda sala é de turma, matéria ou assunto, sempre supervisionável por professor/coordenacao.
- Nenhuma chave de API sensível (Anthropic, service role) chega ao bundle do app — variável sem prefixo `EXPO_PUBLIC_` não é visível no cliente e vive só como secret de Edge Function.
- Funções auxiliares de RLS (`current_papel`, `is_staff`, etc.) moram no schema `private`, fora do que o PostgREST expõe como API pública — evita que virem endpoint (`/rest/v1/rpc/...`) chamável por qualquer um.
- **Pendente de configuração manual** (não tem endpoint de API pra isso): ligar "Leaked Password Protection" em Studio → Authentication → Policies, pra bloquear senha de cadastro conhecida em vazamento (checagem via HaveIBeenPwned).
- Chat com IA (`chat_ia_mensagens`) não tem policy de `INSERT` pra `authenticated` — só a Edge Function `chat-estudo`, com a service role key, grava lá. Isso impede um cliente forjar uma mensagem "assistente" (fingir que a IA disse algo que não disse).
- Mídia de post (`posts-midia`) é um bucket **privado** do Storage, não público — link direto adivinhável exporia foto de post de menor de idade pra quem tiver a URL. O app sempre lê via `createSignedUrl` (validade de 1h); a policy de `SELECT` em `storage.objects` restringe ao primeiro segmento do caminho (`turma_id`) do próprio usuário, com leitura cross-turma só pra professor/coordenacao da mesma escola.

## Limitações conhecidas

- **Modo escuro no preview web**: `useColorScheme()` (NativeWind) já lê a preferência do sistema corretamente — dá pra confirmar pelo header nativo, que muda de cor — mas, especificamente no target **web** desta versão do NativeWind/Expo, a classe `dark` não chega a ser aplicada no `<html>`, então as classes `dark:` do Tailwind ficam sem efeito visual só nesse target. iOS e Android (Expo Go/EAS, o target real do app) seguem o caminho documentado pela lib e não têm esse problema — vale reconfirmar num device/simulador real quando a Fase 1 tiver telas de verdade pra testar. Ver comentário em `app/_layout.tsx`.
- **Só 2 das 222 escolas do seed têm `latitude`/`longitude`** (Escola Secundária Pedro Nunes, Lisboa e Escola Secundária Dom Manuel Martins, Setúbal — geocodificadas à mão só pra validar o pipeline de clima de ponta a ponta). `aviso-clima` pula sozinha qualquer escola sem coordenada, então isso não quebra nada — só significa que o aviso automático de trajeto só funciona pra essas duas por enquanto. Geocodificar as outras 220 é trabalho futuro (dá pra automatizar com Nominatim/OSM, respeitando o limite de 1 req/s do serviço gratuito).
- **Push notification não dá pra testar no preview web**: `expo-notifications` não tem suporte completo no target web (o SDK avisa isso sozinho no console) e `Alert.alert` do React Native também não tem UI no web — o fluxo de logout e o pipeline de push foram verificados via chamada direta à API/Edge Function em vez de clique na tela. Ambos usam APIs padrão do React Native/Expo, então funcionam normalmente em iOS/Android — só não dá pra ver rodando neste preview.
- **`getExpoPushTokenAsync` precisa de `projectId`** (extra.eas.projectId no app config), que só existe depois de `eas init` — isso é trabalho da Fase 6 (build via EAS). Até lá, `registrarPushToken` roda sem erro mas não salva token nenhum (device sem projectId configurado).
- **`chat-estudo` sem `ANTHROPIC_API_KEY` configurada** — responde 503 com uma mensagem clara ("Chat com IA ainda não foi configurado") em vez de dar resposta de IA de verdade. Configure o secret (ver seção "Edge Functions e automações") pra testar a conversa de ponta a ponta.

## Roadmap

- [x] **Fase 0 — Fundação**: projeto Expo + TypeScript, schema Supabase com RLS, lint/test/CI.
- [x] **Fase 1 — Conta e perfil**: cadastro/login (email+senha), onboarding de escola/turma, papel `aluno` por padrão.
- [x] **Fase 2 — Avisos e clima**: mural em tempo real, push via Edge Function, integração Open-Meteo, aviso automático de trajeto.
- [x] **Fase 3 — Estudo**: chat com IA por matéria (aguardando secret `ANTHROPIC_API_KEY`), calculadora de notas.
- [x] **Fase 4 — Feed da turma**: post, curtida, comentário, upload de imagem.
- [ ] **Fase 5 — Chat comunitário**: salas em tempo real, moderação.
- [ ] **Fase 6 — Acabamento**: acessibilidade, estados vazio/erro, build EAS, preparação pra loja.

## Status atual

Fase 4 completa e testada de ponta a ponta contra o projeto Supabase real: criar post (texto, foto, evento com data, lembrete), curtir/descurtir, comentar, apagar post/comentário (autor ou staff) e denunciar post/comentário — tudo com os três estados de lista (carregando/vazio/com dado) e escopado à turma do aluno via RLS. Upload de foto testado de ponta a ponta contra o bucket privado `posts-midia` (upload real + URL assinada renderizando). Fase 3 segue como antes: calculadora de notas e chat com IA (aguardando `ANTHROPIC_API_KEY`). Fase 5 (chat comunitário) é o próximo passo.

### Dados de exemplo

[`supabase/seed.sql`](supabase/seed.sql) popula **222 escolas reais dos distritos de Lisboa e Setúbal** (agrupamentos de escolas e escolas não agrupadas, fonte: rede DGAE/ME 2025/2026), cada uma com uma turma por ano do **5º ao 12º ano** (1776 turmas no total) — é o que a lista de onboarding mostra. Gerenciar escola/turma continua responsabilidade do Studio (ver seção "Fora do escopo" do brief); esse arquivo só evita começar com a lista vazia. A Supabase CLI roda esse arquivo sozinha depois das migrations em `supabase db reset`.
