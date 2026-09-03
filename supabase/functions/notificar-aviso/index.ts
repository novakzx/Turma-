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

Deno.serve(async (req) => {
  try {
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
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
