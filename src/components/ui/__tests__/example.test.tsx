import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

/**
 * Teste de fundação: só confirma que Jest + jest-expo + RNTL conseguem
 * montar um componente RN e fazer uma asserção. As primeiras regras de
 * negócio de verdade (calculadora de notas, escopo de aviso) chegam na
 * Fase 2/3 com testes próprios.
 */
function Saudacao({ nome }: { nome: string }) {
  return (
    <View>
      <Text>Olá, {nome}!</Text>
    </View>
  );
}

describe('fundação do projeto', () => {
  it('renderiza um componente React Native e encontra texto nele', async () => {
    // @testing-library/react-native 14+ usa o pacote `test-renderer` (o
    // substituto do react-test-renderer, removido no React 19) e o render
    // virou assíncrono — sem o await, `screen` ainda não tem nada montado.
    await render(<Saudacao nome="Turma+" />);

    expect(screen.getByText('Olá, Turma+!')).toBeTruthy();
  });
});
