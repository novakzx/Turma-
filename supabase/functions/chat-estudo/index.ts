// Edge Function: chat com IA por matéria (brief 6.2, arquitetura seção 4
// — "chamada só pela Edge Function, nunca direto do app"). Trocado de
// Anthropic (Claude) pra Gemini (Google) a pedido do usuário — o app
// nunca vê a GEMINI_API_KEY; ela só existe como secret desta função
// (`supabase secrets set GEMINI_API_KEY=...`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  escolherModelo,
  montarPromptSistema,
  type ModoChatEstudo,
} from '../_shared/regrasEstudo.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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
    if (!GEMINI_API_KEY) {
      // Não é um erro de código — é a chave ainda não ter sido
      // configurada (ver README > "Edge Functions e automações").
      return respostaJson(
        { error: 'Chat com IA ainda não foi configurado (falta GEMINI_API_KEY).' },
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

    // Gemini usa `role: 'user' | 'model'` (não 'assistant') e agrupa o
    // texto dentro de `parts` — formato bem diferente do Claude, que a
    // troca de provedor obrigou a adaptar aqui.
    const historicoGemini = (historico ?? []).reverse().map((m) => ({
      role: m.papel === 'usuario' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.conteudo as string }],
    }));
    historicoGemini.push({ role: 'user', parts: [{ text: mensagem }] });

    const modelo = escolherModelo(modo);
    const systemPrompt = montarPromptSistema({ nomeMateria: materia.nome, modo });

    // A Gemini às vezes recusa com 503 "high demand" (sobrecarga
    // temporária do lado deles, não um erro nosso — visto de verdade
    // testando o chat) — uma única nova tentativa depois de um respiro
    // curto resolve a maioria dos casos sem esperar o usuário clicar
    // "Enviar" de novo.
    async function chamarGemini() {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: historicoGemini,
          }),
        },
      );
    }

    let respostaGemini = await chamarGemini();
    if (respostaGemini.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      respostaGemini = await chamarGemini();
    }

    if (!respostaGemini.ok) {
      const corpo = await respostaGemini.text();
      console.error('chat-estudo: Gemini recusou', respostaGemini.status, corpo);
      const mensagemErro =
        respostaGemini.status === 503
          ? 'A IA está sobrecarregada agora — tenta de novo em alguns segundos.'
          : 'Não deu pra falar com a IA agora.';
      return respostaJson({ error: mensagemErro }, 502);
    }

    const dadosResposta = await respostaGemini.json();
    // `candidates` pode vir vazio se a resposta foi bloqueada por
    // segurança (`promptFeedback.blockReason`) — trata como "sem texto"
    // em vez de deixar `.join('')` esconder o problema como resposta vazia.
    const textoResposta: string =
      dadosResposta.candidates?.[0]?.content?.parts
        ?.map((bloco: { text?: string }) => bloco.text ?? '')
        .join('\n') ?? '';

    if (!textoResposta) {
      console.error('chat-estudo: Gemini sem texto na resposta', JSON.stringify(dadosResposta));
      return respostaJson({ error: 'A IA não conseguiu responder dessa vez.' }, 502);
    }

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
