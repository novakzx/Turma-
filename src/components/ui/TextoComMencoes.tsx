import { router } from 'expo-router';
import { Text, type TextProps } from 'react-native';

import { buscarPerfilPorNomeUsuario } from '@/features/busca/api';
import { dividirEmTrechos } from '@/lib/mencoes';

/**
 * Renderiza texto de post/comentário/mensagem destacando `@usuário`
 * (pedido explícito do usuário) — toque na menção navega pro perfil
 * dela, se existir e for visível pra quem está lendo (a mesma RLS de
 * `profiles` de sempre; se não resolver, o toque simplesmente não faz
 * nada, sem erro pra não confundir quem tocou).
 *
 * Não avisa quem foi mencionado (sem push, sem inbox de notificação) —
 * é só realce visual + navegação, o "comece simples" documentado; um
 * inbox de menções não lidas fica como evolução natural, não neste MVP.
 */
export function TextoComMencoes({
  texto,
  className,
  mencaoClassName = 'font-semibold text-primary dark:text-primary-dark',
  ...textProps
}: {
  texto: string;
  mencaoClassName?: string;
} & TextProps) {
  async function irParaPerfilDaMencao(nomeUsuario: string) {
    try {
      const perfil = await buscarPerfilPorNomeUsuario(nomeUsuario);
      if (perfil) router.push(`/perfil/${perfil.id}`);
    } catch {
      // Silencioso de propósito — um toque numa menção que não resolve
      // (usuário não existe, ou não é visível pra quem tocou) não deve
      // travar a tela nem mostrar um erro técnico por causa de um toque
      // que não tem consequência nenhuma além de "não abriu nada".
    }
  }

  const trechos = dividirEmTrechos(texto);

  return (
    <Text className={className} {...textProps}>
      {trechos.map((trecho, indice) =>
        trecho.mencao ? (
          <Text
            key={indice}
            className={mencaoClassName}
            onPress={() => void irParaPerfilDaMencao(trecho.mencao as string)}
            suppressHighlighting
          >
            {trecho.texto}
          </Text>
        ) : (
          <Text key={indice}>{trecho.texto}</Text>
        ),
      )}
    </Text>
  );
}
