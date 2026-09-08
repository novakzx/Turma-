# Segurança — Turma+

Este documento descreve a postura de segurança do Turma+ pra quem for revisar, auditar ou manter o projeto depois. Complementa (não substitui) a seção "Segurança e privacidade" e o "Status atual" do [README.md](README.md), que tem o histórico completo, testado, de cada decisão — este é o retrato consolidado de "como o sistema é montado hoje".

O público do app é majoritariamente menor de idade. Toda decisão abaixo trata isso como requisito, não como detalhe.

## 1. Arquitetura e superfície exposta

```
App (Expo/React Native, iOS/Android/Web) ── EXPO_PUBLIC_SUPABASE_ANON_KEY (pública, por design)
        │
        ├── REST + Realtime (PostgREST/Postgres) ── protegido por RLS em toda tabela
        │
        └── supabase.functions.invoke('chat-estudo') ── única Edge Function chamada direto pelo app

Postgres (trigger AFTER INSERT em `avisos`) ──┐
pg_cron (aviso-clima, hoje desligado) ────────┼── x-webhook-secret (Vault) ──> Edge Functions internas
                                               ┘   (notificar-aviso, aviso-clima)

Edge Functions ── SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY ── nunca chegam ao bundle do app
```

Nenhuma chave secreta de verdade (service role, Gemini) tem prefixo `EXPO_PUBLIC_*` — só a URL do projeto e a chave **anônima** (pública por design, protegida por RLS) vão pro bundle do cliente. Ver `.env.example` pra lista completa de variáveis e onde cada uma vive.

## 2. Autenticação

- Supabase Auth (e-mail + senha, e Google OAuth). Login por **nome de usuário** na UI é só uma camada de UX: resolve @usuário → e-mail via uma RPC dedicada (`email_por_nome_usuario`) antes de chamar `signInWithPassword` — o Supabase em si sempre autentica por e-mail.
- Confirmação de e-mail obrigatória (`Confirm email` ligado no projeto). `signUp()` distingue "conta nova, aguardando confirmação" de "e-mail já cadastrado" usando o sinal documentado do próprio Supabase (`user.identities` vazio = conta pré-existente) — nunca lista se um e-mail existe ou não de forma explícita (evita enumeração de conta).
- `email_por_nome_usuario` e `nome_usuario_disponivel` são RPCs `security definer` chamáveis **sem sessão** (têm que ser — resolvem login e checam @usuário disponível antes de existir conta). Ambas têm rate limit por IP real (`private.aplica_rate_limit`, ver §7) desde a migration `rate_limit_lookup_usuario` — sem isso, a primeira devolvia e-mail de verdade pra qualquer @usuário adivinhado, sem limite nenhum (colheita de PII em massa).
- **Pendente de configuração manual** (não existe endpoint de API pra isso, só o Dashboard): ligar "Leaked Password Protection" em Studio → Authentication → Policies (checagem contra HaveIBeenPwned na senha de cadastro).
- Sessão fica em `AsyncStorage`/`localStorage` (padrão do SDK do Supabase pra apps mobile/web sem servidor próprio) — é a mesma troca de arquitetura que qualquer app 100% client+BaaS faz; mitigado por RLS em toda tabela (um token roubado só pode fazer o que o próprio dono da conta poderia).

## 3. Autorização — nunca confia no cliente

Regra de ouro deste projeto: **nenhuma decisão de autorização é feita só no app.** `papel`, `escola_id`, `turma_id`, `isAdmin`-equivalente nunca são aceitos como verdade vinda do cliente — tudo é recalculado/checado no banco:

- Toda tabela tem Row Level Security habilitada (confirmado via `list_tables`/advisors — 22 de 22 tabelas em `public`, nenhuma exceção).
- Policies usam funções auxiliares no schema `private` (`current_papel()`, `current_escola_id()`, `current_turma_id()`, `is_staff()`) que leem `auth.uid()` e o `profiles` correspondente no servidor — nunca um campo mandado pelo cliente.
- `profiles.papel` não é editável pelo próprio usuário (sem policy de `UPDATE` pra essa coluna) — impede autopromoção pra `professor`/`coordenacao`.
- RPCs `security definer` que mudam estado (`criar_conversa_direta`, `criar_conversa_grupo`, `adicionar_participante_grupo`, `responder_pedido_entrada_turma`, `silenciar_usuario`) checam `auth.uid() is null` explicitamente e revalidam a permissão de negócio (dono do grupo, staff da escola certa, etc.) **dentro** da função — nunca assumem que quem chamou tinha esse direito só porque a UI escondia o botão.
- Storage (`posts-midia`, `perfil-fotos`, `stories-midia`) é **privado**; leitura via `createSignedUrl` com policy de `SELECT` restrita ao escopo certo (turma/escola) — link direto nunca é adivinhável.

## 4. Gestão de segredos

| Segredo                         | Onde vive                                                                     | Nunca em                          |
| ------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Bundle do app (pública por design, protegida por RLS)                         | —                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Runtime da Edge Function (injetada automaticamente pelo Supabase)             | Código, `.env`, git               |
| `GEMINI_API_KEY`                | Secret da Edge Function (`supabase secrets set`)                              | App, git                          |
| `WEBHOOK_INTERNAL_SECRET`       | Supabase Vault (gerado em SQL, nunca em texto puro) + secret da Edge Function | Migration em texto puro, git, app |

`.env` nunca foi commitado (`git log --all -- .env` vazio); `.gitignore` cobre `.env`, `.env.*.local` e arquivos de chave nativa. `.env.example` só documenta nomes de variável.

## 5. Política de vulnerabilidades

Este projeto ainda não tem um programa formal de disclosure (sem bug bounty, sem `security.txt`). Até existir um canal dedicado:

- **Reportar um problema de segurança**: contatar diretamente `<< e-mail da coordenação/responsável do projeto — preencher antes do lançamento >>`. Não abrir issue pública com detalhes de exploração.
- Prazo alvo (informal, enquanto o projeto for pequeno): confirmação do recebimento em até 48h, correção de CRITICAL/HIGH em até 7 dias.

## 6. Dependências

- `npm audit --omit=dev` (checado em 2026-09-08): 0 critical, 0 high, 14 moderate — todas em ferramenta de build nativo (`@expo/config-plugins`/`xcode`/`uuid`, via `expo-splash-screen`; `query-string`, via `expo-router`), nenhuma no caminho de execução do bundle web publicado. CI (`.github/workflows/ci.yml`) roda `npm audit --omit=dev --audit-level=high` a cada push/PR — quebra o build se aparecer high/critical de verdade em dependência de produção.
- Sem Firebase nem outra plataforma de backend paralela ao Supabase (decisão do brief original) — menos superfície de configuração errada.

## 7. Rate limiting

| Onde                                    | Limite                                       | Por quê                                                                                                                                                                             |
| --------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat-estudo` (Edge Function)           | 15 mensagens / 5 min por usuário autenticado | Chamada à API Gemini custa dinheiro de verdade — sem limite, um script vira gasto ilimitado. Contagem via RLS do próprio usuário (`chat_ia_mensagens`), imune a bypass client-side. |
| `email_por_nome_usuario` (RPC anônima)  | 20 tentativas / 10 min por IP                | Devolve e-mail real — sem limite, script varria @usuários e colhia e-mails em massa.                                                                                                |
| `nome_usuario_disponivel` (RPC anônima) | 60 tentativas / 5 min por IP                 | Mesmo vetor de enumeração, limite mais generoso (chamada a cada tecla no cadastro).                                                                                                 |

IP vem de `cf-connecting-ip` (header posto pela borda Cloudflare do próprio Supabase — não pelo chamador, diferente de `x-forwarded-for`) via `current_setting('request.headers', true)`, testado de verdade com curl direto no `/rest/v1/rpc` antes de confiar no mecanismo (ver migration `rate_limit_lookup_usuario`).

Edge Functions internas (`notificar-aviso`, `aviso-clima`) não são "rate limited" — são **autenticadas** por `x-webhook-secret` (ver §2/arquitetura); sem o segredo certo, toda chamada cai em 401 antes de qualquer lógica rodar.

## 8. Cabeçalhos HTTP (produção, `vercel.json`)

| Header                      | Valor                                                   | Efeito                                                                                                               |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                   | Força HTTPS                                                                                                          |
| `X-Content-Type-Options`    | `nosniff`                                               | Bloqueia MIME-sniffing                                                                                               |
| `X-Frame-Options`           | `DENY`                                                  | Bloqueia clickjacking (redundante com `frame-ancestors 'none'` da CSP — mantido pra navegador antigo que não lê CSP) |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                       | Não vaza URL completa pra terceiro                                                                                   |
| `Permissions-Policy`        | geolocalização/câmera/microfone/pagamento/USB restritos | Reduz superfície de API sensível do navegador                                                                        |
| `Content-Security-Policy`   | ver abaixo                                              | Mitiga XSS/injeção de recurso externo                                                                                |

**CSP escolhida e por quê**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://njzstudshifdjdqwbqsa.supabase.co; font-src 'self' data:; connect-src 'self' https://njzstudshifdjdqwbqsa.supabase.co wss://njzstudshifdjdqwbqsa.supabase.co; media-src 'self' blob: https://njzstudshifdjdqwbqsa.supabase.co; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.

- `script-src 'self'` sem `unsafe-inline`/`unsafe-eval`: o export de produção (`npx expo export --platform web`) não gera nenhum `<script>` inline — testado de verdade servindo o `dist/` real localmente e inspecionando o DOM.
- `style-src 'unsafe-inline'` **é necessário** — React Native Web resolve estilo dinâmico via atributo `style="..."` inline no próprio elemento (fundamental de como a lib funciona, não só do NativeWind); bloquear isso quebra o layout inteiro. Testado de verdade: o export real tem ~25% dos elementos com `style` inline. Trade-off documentado e aceito, não um esquecimento.
- `img-src`/`media-src`/`connect-src` liberam só `'self'` + o próprio domínio do projeto Supabase (REST, Storage assinado e Realtime via `wss://`) — nenhum outro domínio externo é chamado direto do navegador (Gemini e Open-Meteo só rodam dentro de Edge Function, servidor-a-servidor).
- Testado de ponta a ponta: build de produção servido localmente, CSP aplicada, tela de login renderizou completa, um login de verdade (usuário/senha incorretos) chegou até o Supabase e voltou com a mensagem de erro certa, zero violação de CSP no console.
- Sem `report-uri`/`report-to` ainda — não existe endpoint de coleta de relatório de violação. Adicionar exige decidir onde esses relatórios vão parar (fora do escopo de código puro).

## 9. Logging e tratamento de erro

- Toda Edge Function captura erro no `catch` e loga detalhe (`console.error`) só no servidor — a resposta pro cliente é sempre uma mensagem genérica (`{ error: 'internal_error' }` ou uma mensagem amigável fixa), nunca `String(err)`/stack trace/mensagem crua do Postgres.
- Erro de RLS/constraint do Postgres é traduzido pra mensagem amigável no app (`src/features/auth/errors.ts` e equivalentes) em vez de mostrar o erro técnico pro usuário final.
- Não há coleta centralizada de log de aplicação (Sentry ou equivalente) — hoje a única observabilidade é `query_logs` do Supabase (banco/Auth/Edge Functions) e o console do navegador. Fora do escopo de uma correção de código; decisão de produto/infra pra depois do lançamento.

## 10. Resposta a incidente (básico)

Se um segredo vazar ou um abuso for identificado em produção:

1. **Girar a chave/segredo comprometido primeiro** — `supabase secrets set WEBHOOK_INTERNAL_SECRET=<novo valor>` / `GEMINI_API_KEY=<novo valor>` (painel Supabase → Edge Functions → Secrets) ou gerar novo par de chaves do projeto (`anon`/`service_role`, painel → API) se for a service role.
2. **Revogar sessões** se a suspeita for de token de usuário roubado em massa: Studio → Authentication → Users → forçar logout, ou `auth.sessions` via SQL.
3. **Checar `query_logs`** (Auth + Postgres + Edge Functions, MCP `query_logs` ou painel) pela janela de tempo do incidente antes de decidir o alcance.
4. **Silenciar/banir** conta abusiva via as mesmas ferramentas de moderação já existentes no app (staff) ou direto no Studio, se for além do que a UI cobre.
5. Documentar o incidente e a correção no "Status atual" do README, seguindo o padrão já usado neste projeto (nunca reescrever histórico, só anexar entrada datada com o que aconteceu e o que foi feito).

Não existe hoje um runbook automatizado (rotação de chave por script, alerta automático) — os passos acima são manuais, via Dashboard/CLI do Supabase.
