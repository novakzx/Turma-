import { mensagemDoErroDaFuncao } from '@/lib/erroEdgeFunction';
import { supabase } from '@/lib/supabase';

/**
 * Abre a Stripe Checkout Session pra assinar o Turma+ Premium
 * (R$1,99/mês). A Edge Function (`assinatura-checkout`) monta o preço
 * inline e devolve só a URL — quem completa o pagamento é a própria
 * Stripe, nunca este app (nenhum campo de cartão aqui, ver
 * `app/(app)/assinatura.tsx`).
 */
export async function iniciarCheckoutAssinatura(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('assinatura-checkout');
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  if (!data) throw new Error('A Edge Function não respondeu nada.');
  return data.url;
}

/** Portal da Stripe pra quem já assina: trocar cartão, ver fatura ou
 * cancelar — tudo do lado da Stripe, o app só abre o link. */
export async function abrirPortalAssinatura(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('assinatura-portal');
  if (error) throw new Error(await mensagemDoErroDaFuncao(error));
  if (!data) throw new Error('A Edge Function não respondeu nada.');
  return data.url;
}
