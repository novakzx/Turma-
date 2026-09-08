// Edge Function agendada (brief, arquitetura seção 4 e módulo 6.1).
//
// Rodada por pg_cron a cada 4h (migration aviso_clima_cron). Pra cada
// escola com latitude/longitude cadastrada, consulta o Open-Meteo e cria
// um aviso tipo 'trajeto'/origem 'automatico' quando a previsão passa o
// limite configurável daquela escola. O INSERT em avisos aciona sozinho o
// mesmo trigger de push que um aviso manual (private.notificar_aviso_criado),
// então não precisa chamar notificar-aviso de novo aqui.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { deveDispararTrajeto, montarAvisoTrajeto } from '../_shared/regras.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_INTERNAL_SECRET');

Deno.serve(async (req) => {
  // Mesmo motivo do guard em notificar-aviso: função "só pro cron"
  // sem nenhuma verificação de verdade era chamável por qualquer um na
  // internet (a proteção de plataforma via `verify_jwt` não conta, já
  // que a chave usada era a anon key, pública). Hoje o cron que chamava
  // isso está desativado (`desliga_cron_aviso_clima`), mas o endpoint
  // continua no ar do mesmo jeito — o guard fica mesmo sem chamador
  // ativo agora, pra não ficar exposto se o cron for reativado depois.
  if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: escolas, error } = await admin
    .from('escolas')
    .select('id, nome, latitude, longitude, limite_chuva_percentual, limite_temperatura_celsius')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    // Detalhe de verdade só no log do servidor -- nunca na resposta
    // (evita vazar nome de coluna/tabela/mensagem interna do Postgres
    // pra quem quer que consiga chamar isso).
    console.error('aviso-clima: erro ao listar escolas', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  let criados = 0;

  for (const escola of escolas ?? []) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${escola.latitude}` +
        `&longitude=${escola.longitude}` +
        `&daily=precipitation_probability_max,temperature_2m_max` +
        `&timezone=Europe%2FLisbon&forecast_days=1`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`aviso-clima: Open-Meteo recusou pra ${escola.nome}`, resp.status);
        continue;
      }
      const previsao = await resp.json();

      const precipitacaoMaxima = previsao?.daily?.precipitation_probability_max?.[0];
      const temperaturaMaxima = previsao?.daily?.temperature_2m_max?.[0];
      if (precipitacaoMaxima == null || temperaturaMaxima == null) continue;

      const tipo = deveDispararTrajeto(
        { precipitacaoMaxima, temperaturaMaxima },
        {
          limiteChuvaPercentual: escola.limite_chuva_percentual,
          limiteTemperaturaCelsius: escola.limite_temperatura_celsius,
        },
      );
      if (!tipo) continue;

      // Evita duplicar: já existe um aviso automático de trajeto pra essa
      // escola hoje? (a função roda a cada 4h, não é pra criar 6 avisos
      // iguais no mesmo dia.)
      const { data: existente } = await admin
        .from('avisos')
        .select('id')
        .eq('escola_id', escola.id)
        .eq('tipo', 'trajeto')
        .eq('data_evento', hoje)
        .maybeSingle();
      if (existente) continue;

      const { titulo, descricao } = montarAvisoTrajeto(tipo);
      const { error: insertError } = await admin.from('avisos').insert({
        escola_id: escola.id,
        turma_id: null,
        tipo: 'trajeto',
        origem: 'automatico',
        titulo,
        descricao,
        data_evento: hoje,
      });
      if (insertError) {
        console.error(`aviso-clima: falha ao criar aviso pra ${escola.nome}`, insertError);
        continue;
      }
      criados++;
    } catch (err) {
      console.error(`aviso-clima: falha pra escola ${escola.nome}`, err);
    }
  }

  return new Response(JSON.stringify({ escolas_verificadas: escolas?.length ?? 0, criados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
