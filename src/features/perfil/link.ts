/**
 * Normaliza e valida o "link na bio" do perfil (pedido do usuário).
 * Regra real de negócio — testada (`__tests__/link.test.ts`), não só um
 * `TextField` solto.
 */

const REGEX_DOMINIO_MINIMO = /^[a-z0-9-]+(\.[a-z0-9-]+)+/i;
const TAMANHO_MAXIMO = 200;

export type ResultadoLinkPerfil = { ok: true; link: string } | { ok: false; erro: string };

/**
 * Aceita o link com ou sem `https://` na frente (ninguém digita o
 * protocolo de cabeça) e sempre devolve com protocolo. Só http/https são
 * aceitos — nunca deixa passar `javascript:`/outro esquema perigoso
 * (a constraint `profiles_link_formato` no banco reforça isso de novo,
 * caso alguém chame a API direto sem passar por essa validação).
 * Campo vazio é válido (limpa o link).
 */
export function normalizarLinkPerfil(valorDigitado: string): ResultadoLinkPerfil {
  const valor = valorDigitado.trim();
  if (!valor) return { ok: true, link: '' };
  if (valor.length > TAMANHO_MAXIMO) {
    return { ok: false, erro: `Link muito longo (máximo ${TAMANHO_MAXIMO} caracteres).` };
  }

  const comProtocolo = /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;

  let url: URL;
  try {
    url = new URL(comProtocolo);
  } catch {
    return { ok: false, erro: 'Link inválido.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, erro: 'Só links http/https são aceitos.' };
  }
  if (!REGEX_DOMINIO_MINIMO.test(url.hostname)) {
    return { ok: false, erro: 'Informe um domínio válido (ex.: instagram.com/seu-usuario).' };
  }

  return { ok: true, link: url.toString() };
}

/** Texto mais curto pra exibir no perfil (sem "https://" nem "/" final)
 * — o link de verdade (com protocolo) é quem abre no navegador; isto é
 * só o rótulo visível, igual Instagram mostra "instagram.com/fulano"
 * em vez da URL inteira. */
export function formatarLinkExibicao(link: string): string {
  return link.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
