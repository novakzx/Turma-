// Edge Function: chat com IA por matéria (brief 6.2, arquitetura seção 4
// — "chamada só pela Edge Function, nunca direto do app"). O app nunca
// vê a ANTHROPIC_API_KEY; ela só existe como secret desta função
// (`supabase secrets set ANTHROPIC_API_KEY=...`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  escolherModelo,
  montarPromptSistema,
  type ModoChatEstudo,
} from '../_shared/regrasEstudo.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const HISTORICO_MAXIMO = 20;

// Esta função (diferente de notificar-aviso/aviso-clima) é chamada direto
// do app via `supabase.functions.invoke` — no target web isso dispara um
// preflight OPTIONS, e sem esses headers o navegador bloqueia a resposta
// antes mesmo dela chegar no cliente (achado testando de verdade: dava
// "Failed to send a request to the Edge Function" sem pista nenhuma até
// olhar o console do navegador).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      // Não é um erro de código — é a Fase 3 esperando o secret ser
      // configurado (ver README > "Edge Functions e automações").
      return respostaJson(
        { error: 'Chat com IA ainda não foi configurado (falta ANTHROPIC_API_KEY).' },
        503,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respostaJson({ error: 'Sem autenticação.' }, 401);
    }

    const payload = await req.json();
    const materiaId = payload?.materiaId as string | undefined;
    const mensagem = (payload?.mensagem as string | undefined)?.trim();
    const modo = (payload?.modo as ModoChatEstudo | undefined) ?? 'duvida';

    if (!materiaId || !mensagem) {
      return respostaJson({ error: 'payload inválido' }, 400);
    }

    // Client "como o usuário" (repassa o JWT dele) — RLS garante sozinha
    // que só vem histórico do próprio aluno, sem precisar decodificar o
    // token à mão aqui.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return respostaJson({ error: 'Sessão inválida.' }, 401);
    }

    const { data: materia, error: materiaError } = await userClient
      .from('materias')
      .select('nome')
      .eq('id', materiaId)
      .single();
    if (materiaError || !materia) {
      return respostaJson({ error: 'Matéria não encontrada.' }, 404);
    }

    const { data: historico, error: historicoError } = await userClient
      .from('chat_ia_mensagens')
      .select('papel, conteudo')
      .eq('materia_id', materiaId)
      .order('criado_em', { ascending: false })
      .limit(HISTORICO_MAXIMO);
    if (historicoError) throw historicoError;

    const mensagensAnthropic = (historico ?? []).reverse().map((m) => ({
      role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
      content: m.conteudo,
    }));
    mensagensAnthropic.push({ role: 'user', content: mensagem });

    const modelo = escolherModelo(modo);
    const systemPrompt = montarPromptSistema({ nomeMateria: materia.nome, modo });

    const respostaAnthropic = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1024,
        system: systemPrompt,
        messages: mensagensAnthropic,
      }),
    });

    if (!respostaAnthropic.ok) {
      const corpo = await respostaAnthropic.text();
      console.error('chat-estudo: Anthropic recusou', respostaAnthropic.status, corpo);
      return respostaJson({ error: 'Não deu pra falar com a IA agora.' }, 502);
    }

    const dadosResposta = await respostaAnthropic.json();
    const textoResposta = (dadosResposta.content ?? [])
      .filter((bloco: { type: string }) => bloco.type === 'text')
      .map((bloco: { text: string }) => bloco.text)
      .join('\n');

    // Persiste os dois lados com a service role — não existe policy de
    // INSERT pra `authenticated` nessa tabela de propósito (evita um
    // cliente forjar uma mensagem "assistente").
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: insertError } = await admin.from('chat_ia_mensagens').insert([
      { aluno_id: user.id, materia_id: materiaId, papel: 'usuario', conteudo: mensagem },
      { aluno_id: user.id, materia_id: materiaId, papel: 'assistente', conteudo: textoResposta },
    ]);
    if (insertError) console.error('chat-estudo: falha ao salvar histórico', insertError);

    return respostaJson({ resposta: textoResposta, modelo });
  } catch (err) {
    console.error('chat-estudo falhou:', err);
    return respostaJson({ error: String(err) }, 500);
  }
});
