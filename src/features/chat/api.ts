import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import type { MensagemChat, Sala, TipoMidiaMensagem } from './types';

const BUCKET_MIDIA = 'salas-midia';

/** RLS já resolve o escopo: sala de turma/matéria só entra quem é da
 * turma certa, sala de assunto é visível pra escola inteira (brief
 * 6.5) — aqui só ordena por tipo (turma primeiro) e nome. */
export async function listarSalas(): Promise<Sala[]> {
  const { data, error } = await supabase.from('salas_chat').select('*').order('tipo').order('nome');
  if (error) throw error;
  return data;
}

export async function buscarSala(id: string): Promise<Sala> {
  const { data, error } = await supabase.from('salas_chat').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function criarSalaAssunto(params: {
  escolaId: string;
  criadoPor: string;
  nome: string;
}): Promise<Sala> {
  const { data, error } = await supabase
    .from('salas_chat')
    .insert({
      escola_id: params.escolaId,
      tipo: 'assunto',
      criado_por: params.criadoPor,
      nome: params.nome,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Trancar/destrancar: só staff (RLS de `salas_chat_update`). */
export async function definirSalaTrancada(salaId: string, trancada: boolean) {
  const { error } = await supabase.from('salas_chat').update({ trancada }).eq('id', salaId);
  if (error) throw error;
}

export type MensagemComAutor = MensagemChat & { profiles: { nome: string } | null };

/** Mensagem apagada (soft delete) some da lista de quem não é staff —
 * a policy de select já filtra isso no banco (`not apagada or
 * is_staff()`); pra staff ela continua vindo, marcada, pra fim de
 * auditoria. */
export async function listarMensagens(salaId: string): Promise<MensagemComAutor[]> {
  const { data, error } = await supabase
    .from('mensagens_chat')
    .select('*, profiles(nome)')
    .eq('sala_id', salaId)
    .order('criado_em')
    .limit(200);
  if (error) throw error;
  return data as unknown as MensagemComAutor[];
}

export async function enviarMensagem(params: {
  salaId: string;
  autorId: string;
  conteudo?: string;
  midiaUrl?: string;
  midiaTipo?: TipoMidiaMensagem;
}) {
  const { error } = await supabase.from('mensagens_chat').insert({
    sala_id: params.salaId,
    autor_id: params.autorId,
    conteudo: params.conteudo ?? null,
    midia_url: params.midiaUrl ?? null,
    midia_tipo: params.midiaTipo ?? null,
  });
  if (error) throw error;
}

/** Upload de foto/áudio pra dentro de uma sala (pedido do usuário) —
 * mesma ideia de `fazerUploadMidiaConversa`, path começa com o id da
 * sala; a policy do bucket espelha `mensagens_chat_insert` (sala não
 * trancada, autor não silenciado). */
export async function fazerUploadMidiaSala(
  salaId: string,
  uriLocal: string,
  tipoPadrao: 'image' | 'audio',
): Promise<string> {
  const resposta = await fetch(uriLocal);
  const arrayBuffer = await resposta.arrayBuffer();
  const contentType = resposta.headers.get('content-type') ?? `${tipoPadrao}/octet-stream`;
  const extensao = contentType.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') || 'bin';
  const caminho = `${salaId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_MIDIA).upload(caminho, arrayBuffer, {
    contentType,
  });
  if (error) throw error;
  return caminho;
}

export async function obterUrlAssinadaSala(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_MIDIA)
    .createSignedUrl(caminho, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Soft delete (`apagada = true`) — só staff consegue de verdade (RLS +
 * GRANT restrito só a essa coluna), o botão nem aparece pra aluno. */
export async function apagarMensagem(id: string) {
  const { error } = await supabase.from('mensagens_chat').update({ apagada: true }).eq('id', id);
  if (error) throw error;
}

/** Silenciar/dessilenciar um usuário (`ate = null` dessilencia). Só
 * staff da mesma escola (RLS `profiles_update_moderacao` + trigger de
 * guarda em `profiles`). */
/** O "agora" pro cálculo do prazo tem que vir do servidor (RPC), não do
 * `Date.now()` do dispositivo — um relógio de cliente errado (comum em
 * dispositivo real, e foi o que aconteceu testando isto aqui) grava um
 * `silenciado_ate` que já nasce expirado, sem erro nenhum. A função é
 * `security invoker`: continua sujeita à mesma RLS/trigger de sempre. */
export async function silenciarUsuario(perfilId: string, horas: number) {
  const { error } = await supabase.rpc('silenciar_usuario', {
    p_perfil_id: perfilId,
    p_horas: horas,
  });
  if (error) throw error;
}

/** Realtime: qualquer INSERT/UPDATE em `mensagens_chat` da sala aciona
 * `aoMudar` — o chamador decide o que fazer (aqui, invalidar a query e
 * deixar o TanStack Query refazer o fetch com os joins de autor). */
export function assinarMensagens(salaId: string, aoMudar: () => void): RealtimeChannel {
  return supabase
    .channel(`mensagens-sala-${salaId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mensagens_chat', filter: `sala_id=eq.${salaId}` },
      aoMudar,
    )
    .subscribe();
}

/** Realtime da lista de salas (escola inteira): pega sala de assunto
 * nova e trancar/destrancar ao vivo, sem precisar dar refresh. */
export function assinarSalas(escolaId: string, aoMudar: () => void): RealtimeChannel {
  return supabase
    .channel(`salas-escola-${escolaId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'salas_chat', filter: `escola_id=eq.${escolaId}` },
      aoMudar,
    )
    .subscribe();
}
