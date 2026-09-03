@AGENTS.md

# Turma+

Ver [README.md](README.md) pra stack, setup, variáveis de ambiente, estrutura de pastas e roadmap por fase. Regras que valem pra qualquer trabalho neste repo:

- Nenhuma chave secreta (Anthropic, service role do Supabase) entra no código do app — só em Edge Functions. Variável visível no cliente sempre começa com `EXPO_PUBLIC_`.
- Toda tabela nova em `supabase/migrations/` precisa de RLS habilitada e policy por papel (`aluno`/`professor`/`coordenacao`) — ver o schema inicial pra o padrão já usado (funções `private.current_papel()`, `private.current_escola_id()`, `private.current_turma_id()`, `private.is_staff()`).
- Essas funções ficam no schema `private` (fora do que o PostgREST expõe como API). Se mover mais alguma função de schema, lembre que `ALTER FUNCTION ... SET SCHEMA` atualiza quem a referencia via _policy_ (RLS guarda por OID), mas **não** atualiza chamadas feitas de dentro do _corpo_ de outra função com o schema antigo escrito por extenso (ex.: `public.is_staff()` dentro de outra função) — isso já quebrou aviso em produção uma vez (ver migration `fix_private_schema_internal_refs`). Sempre teste a operação de verdade (não só confie na migration ter rodado sem erro) depois de mexer em RLS.
- Regra de negócio de verdade (cálculo de nota, escopo de aviso, moderação) ganha teste antes de ser considerada pronta.
- TypeScript estrito, sem `any` solto. Rode `npm run lint`, `npm run typecheck` e `npm test` antes de considerar uma mudança terminada.
