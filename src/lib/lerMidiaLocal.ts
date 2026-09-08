/**
 * Lê os bytes de uma mídia local (foto/vídeo escolhido pelo usuário)
 * pra fazer upload no Storage.
 *
 * No **native** (iOS/Android, app de verdade), `expo-image-picker`
 * devolve só uma `uri` (`file://...`) e `fetch(uri)` funciona sem
 * problema — é o único jeito de ler os bytes ali.
 *
 * No **web**, a uri é um `blob:...` — e usar `fetch()` num `blob:`
 * local esbarra num bug conhecido do WebKit/Safari (relatado ao vivo:
 * "Load failed" só em iPhone, mesmo depois de liberar `blob:` no
 * `connect-src` da CSP — não era CSP, é o próprio Safari que às vezes
 * recusa `fetch` de um blob: criado pela própria página, especialmente
 * dentro de um app instalado na tela de início; várias issues abertas
 * no WebKit/Apple Developer Forums sobre isso, sem previsão de fix).
 * A correção de verdade: no web, `expo-image-picker` também devolve o
 * `File` cru do navegador (`asset.file` — documentado no próprio tipo
 * como "web-only, pra usar com upload"). Ler os bytes direto do `File`
 * com `.arrayBuffer()` não passa por rede nenhuma (nem `fetch`, nem
 * CSP) — o bug do Safari nunca entra em jogo.
 */
export async function lerBytesDeMidiaLocal(
  uri: string,
  arquivoWeb: File | null | undefined,
): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
  if (arquivoWeb) {
    return {
      arrayBuffer: await arquivoWeb.arrayBuffer(),
      contentType: arquivoWeb.type || 'application/octet-stream',
    };
  }
  const resposta = await fetch(uri);
  return {
    arrayBuffer: await resposta.arrayBuffer(),
    contentType: resposta.headers.get('content-type') ?? 'application/octet-stream',
  };
}
