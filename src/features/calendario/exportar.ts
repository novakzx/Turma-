import { exportarArquivoTexto } from '@/lib/exportarArquivo';

/** Exporta o `.ics` gerado (`gerarIcs`, em `regras.ts`) pro calendário do
 * celular/computador — pedido do usuário. Ver `exportarArquivoTexto` pro
 * porquê de web e nativo terem caminhos bem diferentes aqui. */
export async function exportarIcs(conteudoIcs: string, nomeArquivo = 'turma-mais-calendario.ics') {
  await exportarArquivoTexto(conteudoIcs, nomeArquivo, 'text/calendar');
}
