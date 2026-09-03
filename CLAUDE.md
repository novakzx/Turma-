@AGENTS.md

# Turma+

Ver [README.md](README.md) pra stack, setup, variáveis de ambiente, estrutura de pastas e roadmap por fase. Regras que valem pra qualquer trabalho neste repo:

- Nenhuma chave secreta (Anthropic, service role do Supabase) entra no código do app — só em Edge Functions. Variável visível no cliente sempre começa com `EXPO_PUBLIC_`.
- Toda tabela nova em `supabase/migrations/` precisa de RLS habilitada e policy por papel (`aluno`/`professor`/`coordenacao`) — ver o schema inicial pra o padrão já usado (funções `current_papel()`, `current_escola_id()`, `current_turma_id()`, `is_staff()`).
- Regra de negócio de verdade (cálculo de nota, escopo de aviso, moderação) ganha teste antes de ser considerada pronta.
- TypeScript estrito, sem `any` solto. Rode `npm run lint`, `npm run typecheck` e `npm test` antes de considerar uma mudança terminada.
