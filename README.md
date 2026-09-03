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
src/
  features/           # Uma pasta por domínio: auth, onboarding, perfil (avisos/estudo/notas/feed/chat vêm nas próximas fases)
  components/ui/      # Componentes visuais reutilizáveis, sem regra de negócio
  lib/                # Supabase client, TanStack Query client, global.css
  stores/             # Zustand — só estado client-side (filtros, rascunhos)
  types/              # Tipos compartilhados (database.ts é gerado pelo Supabase CLI)
supabase/
  migrations/         # Schema versionado, aplicado via `supabase db push`
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

## Limitações conhecidas

- **Modo escuro no preview web**: `useColorScheme()` (NativeWind) já lê a preferência do sistema corretamente — dá pra confirmar pelo header nativo, que muda de cor — mas, especificamente no target **web** desta versão do NativeWind/Expo, a classe `dark` não chega a ser aplicada no `<html>`, então as classes `dark:` do Tailwind ficam sem efeito visual só nesse target. iOS e Android (Expo Go/EAS, o target real do app) seguem o caminho documentado pela lib e não têm esse problema — vale reconfirmar num device/simulador real quando a Fase 1 tiver telas de verdade pra testar. Ver comentário em `app/_layout.tsx`.

## Roadmap

- [x] **Fase 0 — Fundação**: projeto Expo + TypeScript, schema Supabase com RLS, lint/test/CI.
- [x] **Fase 1 — Conta e perfil**: cadastro/login (email+senha), onboarding de escola/turma, papel `aluno` por padrão.
- [ ] **Fase 2 — Avisos e clima**: mural de avisos, push, integração Open-Meteo, aviso automático de trajeto.
- [ ] **Fase 3 — Estudo**: chat com IA por matéria, calculadora de notas.
- [ ] **Fase 4 — Feed da turma**: post, curtida, comentário, upload de imagem.
- [ ] **Fase 5 — Chat comunitário**: salas em tempo real, moderação.
- [ ] **Fase 6 — Acabamento**: acessibilidade, estados vazio/erro, build EAS, preparação pra loja.

## Status atual

Fase 1 completa e testada de ponta a ponta contra um projeto Supabase real (cadastro → confirmação de e-mail → login → onboarding → home → logout), com `Stack.Protected` do Expo Router decidindo a rota certa a partir de sessão + perfil. Fase 2 é o próximo passo.

### Contas de teste / dados de exemplo

O projeto de dev tem uma escola e duas turmas de exemplo (criadas via SQL, não pelo app — gerenciar escola/turma é responsabilidade do Studio, ver seção "Fora do escopo" do brief). Ajuste ou apague pelo Supabase Studio quando quiser.
