import { Platform } from 'react-native';

/**
 * Exporta um conteúdo texto (`.ics` do calendário, `.json` dos dados
 * pessoais) pro dispositivo do usuário. Web e nativo são bem diferentes
 * aqui: no navegador não existe "sistema de arquivos" de verdade
 * (`expo-file-system` no alvo web é só um stub vazio, testado direto no
 * código-fonte da lib antes de escrever isto — ver `ExpoFileSystem.web.d.ts`
 * do pacote), então cria um `Blob` e dispara o download via um
 * `<a download>` temporário — suportado nativamente pelo próprio
 * navegador (nada a ver com a restrição de download de artifact/sandbox,
 * isto roda no site publicado de verdade). No nativo, `expo-file-system`
 * grava um arquivo real no diretório de cache e `expo-sharing` abre a
 * folha de compartilhamento do sistema.
 */
export async function exportarArquivoTexto(
  conteudo: string,
  nomeArquivo: string,
  mimeType: string,
) {
  if (Platform.OS === 'web') {
    const blob = new Blob([conteudo], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const arquivo = new File(Paths.cache, nomeArquivo);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  arquivo.write(conteudo);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(arquivo.uri, { mimeType });
  }
}
