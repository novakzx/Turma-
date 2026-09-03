import { supabase } from '@/lib/supabase';

import type { MetadadosCadastro, Profile } from './types';

/**
 * Idade + nome de usuário + os dois consentimentos (Termos de Uso e
 * ciência dos pais/responsáveis) são pedido explícito do usuário
 * (child safety é requisito deste projeto desde o brief original —
 * público majoritariamente menor de idade). Os dois booleanos de
 * aceite não viram coluna "aceitou: true/false" solta — o que fica
 * gravado de verdade é o *momento* da aceitação dos termos
 * (`termos_aceitos_em`) e o estado do consentimento dos responsáveis
 * (`consentimento_responsavel`), ver `fetchOrCreateProfile`.
 */
export async function signUp(params: {
  nome: string;
  nomeUsuario: string;
  idade: number;
  email: string;
  senha: string;
  aceitouTermos: boolean;
  consentimentoResponsavel: boolean;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.senha,
    // Guardado em user_metadata pra fetchOrCreateProfile usar no primeiro
    // login (signUp pode não devolver sessão se a confirmação de e-mail
    // estiver ligada, então o profile só é criado depois, no primeiro
    // signIn bem-sucedido).
    options: {
      data: {
        nome: params.nome,
        nomeUsuario: params.nomeUsuario,
        idade: params.idade,
        aceitouTermos: params.aceitouTermos,
        consentimentoResponsavel: params.consentimentoResponsavel,
      } satisfies MetadadosCadastro,
    },
  });
  if (error) throw error;
  return data;
}

/** Checa disponibilidade de @usuário antes de mandar o cadastro pra
 * frente — sem isso, um @usuário repetido só apareceria como erro no
 * primeiro login (depois de confirmar e-mail), sem UI nenhuma pra
 * mostrar (ver comentário na migration `cadastro_idade_termos_consentimento`). */
export async function nomeUsuarioDisponivel(nomeUsuario: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('nome_usuario_disponivel', {
    p_nome_usuario: nomeUsuario,
  });
  if (error) throw error;
  return data;
}

export async function signIn(params: { email: string; senha: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.senha,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Troca de e-mail passa por confirmação (o Supabase manda um link pro
 * endereço novo) — o e-mail só muda de verdade depois de clicar nele,
 * então isso aqui só dispara o pedido. */
export async function atualizarEmail(novoEmail: string) {
  const { error } = await supabase.auth.updateUser({ email: novoEmail });
  if (error) throw error;
}

export async function atualizarSenha(novaSenha: string) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

/**
 * Garante que existe uma linha em `profiles` pro usuário logado, criando
 * uma se for a primeira vez. Não dá pra criar isso no momento do signUp
 * porque, com confirmação de e-mail ligada, ainda não existe sessão
 * autenticada nesse momento (a policy de insert exige auth.uid() = id).
 */
export async function fetchOrCreateProfile(
  userId: string,
  fallback: {
    email: string;
    nome?: string;
    nomeUsuario?: string;
    idade?: number;
    aceitouTermos?: boolean;
    consentimentoResponsavel?: boolean;
  },
): Promise<Profile> {
  const { data: existente, error: erroSelect } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (erroSelect) throw erroSelect;
  if (existente) return existente;

  const nome = fallback.nome?.trim() || fallback.email;
  const { data: criado, error: erroInsert } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: fallback.email,
      nome,
      nome_usuario: fallback.nomeUsuario,
      idade: fallback.idade,
      consentimento_responsavel: fallback.consentimentoResponsavel ?? false,
      // "Agora" do cliente é aceitável aqui — é só um registro de
      // quando a pessoa aceitou os termos (não uma janela de segurança
      // que alguém tentaria burlar, ao contrário do prazo de
      // `silenciar_usuario` — ver lição em CLAUDE.md).
      termos_aceitos_em: fallback.aceitouTermos ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (erroInsert) throw erroInsert;
  return criado;
}
