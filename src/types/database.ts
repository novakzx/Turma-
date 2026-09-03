/**
 * Placeholder pro tipo `Database` gerado pelo Supabase CLI a partir do schema real:
 *
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Até a Fase 1 rodar contra um projeto Supabase de verdade, mantemos um tipo
 * mínimo pra não travar o `createClient<Database>()` em src/lib/supabase.ts.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
