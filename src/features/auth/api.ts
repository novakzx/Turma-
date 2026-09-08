import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import type { MetadadosCadastro, Profile } from './types';

// Só importa de verdade no target web (fecha o popup de auth quando o
// fluxo usa `WebBrowser.openAuthSessionAsync` — não é o nosso caso aqui,
// já que no web a gente redireciona a página inteira, mas é inofensivo
// chamar sempre, e é o padrão documentado pelo próprio Expo/Supabase).
WebBrowser.maybeCompleteAuthSession();

// Precisa bater com `scheme` em app.json — é o esquema de URL customizado
// que o navegador in-app do login social usa pra voltar pro app nativo
// depois que o usuário autoriza no Google.
const ESQUEMA_APP = 'turmamais';
const REDIRECT_NATIVO = `${ESQUEMA_APP}://google-auth`;

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
/**
 * Volta a pedir e-mail de verdade no cadastro (pedido explícito do
 * usuário, depois de configurar o SMTP do Resend) — a versão anterior
 * gerava um e-mail sintético (`<usuário>.<timestamp>@turmamais.internal`)
 * só pra satisfazer o `auth.users.email`, porque o Supabase Auth não
 * tem cadastro "só usuário". Com SMTP configurado, o e-mail de
 * confirmação chega de verdade — então voltou a fazer sentido coletar
 * o e-mail real (também abre a porta pra "esqueci minha senha" no
 * futuro, que não existe ainda). `signIn` continua por nome de
 * usuário — a RPC `email_por_nome_usuario` (ver migration
 * `login_sem_email_por_usuario`) resolve pro e-mail de verdade agora
 * guardado, sem precisar mudar a UI de login.
 */
export async function signUp(params: {
  nome: string;
  email: string;
  nomeUsuario: string;
  idade: number;
  senha: string;
  aceitouTermos: boolean;
  consentimentoResponsavel: boolean;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.senha,
    options: {
      // Achado testando de verdade ("quando confirmo o e-mail ele não
      // confirma no app"): sem isso, o link do e-mail de confirmação
      // usa o "Site URL" configurado no painel do Supabase como
      // destino do redirect — e esse valor estava apontando pra
      // `localhost:3000`, um endereço que não roda em lugar nenhum
      // acessível pra quem clica o link (confirmado no log: o
      // `/verify` volta 303 igual, `email_confirmed_at` é gravado
      // certinho no banco — a conta REALMENTE fica confirmada — só o
      // navegador cai numa página morta depois, então parece que "não
      // confirmou"). No web, manda pra origem de onde o cadastro foi
      // feito (funciona tanto em `localhost:8081` local quanto no
      // domínio de produção, sem precisar hard-codar nenhum dos dois —
      // mesma ideia já usada em `signInWithGoogle`). Precisa também
      // estar na lista de "Redirect URLs" do painel do Supabase, senão
      // esse valor é ignorado silenciosamente e cai de volta no Site
      // URL errado.
      //
      // Nativo (iOS/Android) ainda não está coberto aqui: precisaria de
      // um listener de deep link pra pegar o token do
      // `turmamais://...` de volta e chamar `setSession`, igual o
      // `signInWithGoogle` nativo já faz manualmente — não implementado
      // ainda, ver README.
      emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      // Guardado em user_metadata pra fetchOrCreateProfile usar no primeiro
      // login (signUp não devolve sessão enquanto o e-mail não for
      // confirmado — "Confirm email" ligado de propósito agora que o SMTP
      // funciona —, então o profile só é criado depois, no primeiro
      // signIn bem-sucedido).
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

/** Login do Supabase só aceita e-mail, não usuário — resolve nome de
 * usuário pro e-mail interno (RPC `security definer`, mesma razão da
 * `nome_usuario_disponivel`: quem ainda não tem sessão não pode
 * consultar `profiles` direto pela RLS normal) antes de chamar
 * `signInWithPassword`. Usuário inexistente cai no mesmo erro genérico
 * de "credenciais inválidas" do próprio Supabase — não dá pista de qual
 * dos dois (usuário ou senha) está errado. */
export async function signIn(params: { nomeUsuario: string; senha: string }) {
  const { data: email, error: erroResolvendo } = await supabase.rpc('email_por_nome_usuario', {
    p_nome_usuario: params.nomeUsuario,
  });
  if (erroResolvendo) throw erroResolvendo;
  if (!email) throw new Error('Invalid login credentials');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: params.senha,
  });
  if (error) throw error;
  return data;
}

/**
 * Login com Google — web e nativo são fluxos bem diferentes por baixo:
 * - **Web**: `signInWithOAuth` já redireciona a página inteira pro
 *   Google e de volta; o cliente detecta a sessão nova sozinho ao voltar
 *   (`detectSessionInUrl`, ligado só no target web — ver
 *   `src/lib/supabase.ts`), então não precisa fazer mais nada aqui além
 *   de disparar o redirect.
 * - **Nativo**: não existe "redirecionar a página" — abre o fluxo numa
 *   aba de navegador dentro do app (`expo-web-browser`) e espera voltar
 *   pro esquema customizado do app (`REDIRECT_NATIVO`); aí extrai os
 *   tokens do fragmento da URL de retorno e ativa a sessão manualmente
 *   com `setSession` (o mesmo padrão documentado pelo próprio Supabase
 *   pra Expo — ver "Build a Social Auth App with Expo React Native").
 *
 * Cria a conta sozinho no primeiro login (Supabase Auth de propósito) —
 * mas Google não dá nome de usuário, idade nem os dois consentimentos
 * que este app exige; por isso o profile criado por `fetchOrCreateProfile`
 * fica incompleto de propósito, e o app.tsx raiz redireciona pra
 * `(completar-cadastro)` até esses campos serem preenchidos (ver
 * `completarCadastroSocial` e `app/_layout.tsx`).
 */
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT_NATIVO, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Não deu pra iniciar o login com Google.');

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_NATIVO);
  if (resultado.type !== 'success' || !('url' in resultado)) {
    throw new Error('Login com Google cancelado.');
  }

  const params = new URLSearchParams(new URL(resultado.url).hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error('Não deu pra concluir o login com Google.');
  }

  const { error: erroSessao } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (erroSessao) throw erroSessao;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
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

/**
 * Preenche o que o login social (Google/Apple) não dá de jeito nenhum:
 * nome de usuário, idade, aceite dos Termos de Uso e o consentimento dos
 * pais/responsáveis. `fetchOrCreateProfile` já criou a linha em
 * `profiles` no primeiro login (sem esses campos); esta função só
 * atualiza — por isso a migration `login_social_completar_cadastro`
 * concede `UPDATE` nessas colunas além do `INSERT` de sempre.
 */
export async function completarCadastroSocial(
  userId: string,
  params: {
    nomeUsuario: string;
    idade: number;
    aceitouTermos: boolean;
    consentimentoResponsavel: boolean;
  },
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      nome_usuario: params.nomeUsuario,
      idade: params.idade,
      consentimento_responsavel: params.consentimentoResponsavel,
      termos_aceitos_em: params.aceitouTermos ? new Date().toISOString() : null,
    })
    .eq('id', userId);
  if (error) throw error;
}
