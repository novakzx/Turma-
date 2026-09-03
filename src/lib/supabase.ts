import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// Fallback com o valor real do projeto (não é segredo — é a chave
// "publishable"/anônima, protegida pelas policies de RLS, não pelo
// sigilo dela; é literalmente pra isso que existe o prefixo
// `EXPO_PUBLIC_`, que já a expõe no bundle de qualquer forma). Existe
// porque plataformas de deploy de terceiros (ex.: Vercel) às vezes não
// repassam a env var pro processo de build direito — às vezes nem
// "ausente" (`undefined`), e sim uma **string vazia** (`""`), que é
// exatamente o motivo de usar `||` aqui em vez de `??`: `??` só troca
// `null`/`undefined`, e uma env var configurada errada na plataforma de
// deploy mas presente como "" passaria por ele igual, chegando vazia no
// `createClient` (que falha com "supabaseUrl is required." — foi
// exatamente o que aconteceu na Vercel). `.env` continua sendo o jeito
// certo de configurar localmente; isso só evita o app quebrar inteiro
// quando outra pessoa hospeda o build sem passar a env var direito.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://njzstudshifdjdqwbqsa.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_451zpZIt-Kv262W9XfSvHQ_0TcsxvNY';

/**
 * Cliente Supabase do app. Usa apenas a chave anônima (pública) — ela é
 * segura de expor no bundle porque toda a autorização real vem das
 * políticas de Row Level Security no Postgres, não desta chave.
 *
 * Nenhum segredo (chave da Gemini, service role key, etc.) deve
 * jamais aparecer aqui: essas chamadas passam por Edge Functions.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
