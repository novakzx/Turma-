// Edge Function: dispara push (brief, arquitetura seção 4).
//
// Chamada por um trigger AFTER INSERT em public.avisos (manual ou
// automático de trajeto — ver private.notificar_aviso_criado na migration
// avisos_push_trigger). Usa a service role key (injetada automaticamente
// pelo runtime da Edge Function, nunca fica no app) pra ler push_token
// ignorando RLS, e a lógica pura de _shared/regras.ts pra decidir quem
// recebe (mesma lógica coberta em _shared/__tests__/regras.test.ts).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { emLotes, filtrarDestinatarios, type PerfilDestinatario } from '../_shared/regras.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_INTERNAL_SECRET');

Deno.serve(async (req) => {
  try {
    // CRÍTICO (auditoria de segurança): esta função só deveria ser
    // chamada pelo trigger de INSERT em `avisos` — mas `verify_jwt` do
    // Supabase aceita qualquer JWT válido do projeto, e o trigger
    // autenticava com a anon key, que é PÚBLICA de propósito (vive no
    // bundle do app). Ou seja: qualquer pessoa na internet, sabendo só
    // a URL do projeto, conseguia chamar isso direto com
    // `escola_id`/`titulo`/`descricao` forjados e a função — rodando
    // com a service role, ignorando RLS — mandava push notification de
    // conteúdo arbitrário pra todo mundo daquela escola. O segredo
    // comparado aqui não é a anon key nem a service role: é um valor
    // gerado à parte (Vault, migration `endurece_edge_functions_internas`)
    // que só o trigger e esta função conhecem.
    if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    const { id, escola_id, turma_id, tipo, titulo, descricao } = payload ?? {};

    if (!id || !escola_id || !titulo) {
      return new Response(JSON.stringify({ error: 'payload inválido' }), { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: perfis, error } = await admin
      .from('profiles')
      .select('id, papel, escola_id, turma_id, push_token')
      .eq('escola_id', escola_id)
      .not('push_token', 'is', null);

    if (error) throw error;

    const destinatarios = filtrarDestinatarios((perfis ?? []) as PerfilDestinatario[], {
      escola_id,
      turma_id: turma_id ?? null,
    });

    if (destinatarios.length === 0) {
      return new Response(JSON.stringify({ enviados: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mensagens = destinatarios.map((d) => ({
      to: d.push_token,
      title: titulo as string,
      body: (descricao as string | null) ?? '',
      data: { avisoId: id, tipo },
    }));

    let enviados = 0;
    for (const lote of emLotes(mensagens)) {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lote),
      });
      if (resp.ok) enviados += lote.length;
      else console.error('notificar-aviso: Expo Push recusou um lote', await resp.text());
    }

    return new Response(JSON.stringify({ enviados }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notificar-aviso falhou:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
});
