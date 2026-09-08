import { calcularPercentualOpcao, calcularResultadoEnquete } from '../regras';

describe('calcularResultadoEnquete', () => {
  const opcoes = [{ id: 'op-1' }, { id: 'op-2' }, { id: 'op-3' }];

  it('zera a contagem de opções sem voto nenhum', () => {
    const resultado = calcularResultadoEnquete(opcoes, [], 'user-1');
    expect(resultado.contagemPorOpcao).toEqual({ 'op-1': 0, 'op-2': 0, 'op-3': 0 });
    expect(resultado.totalVotos).toBe(0);
    expect(resultado.meuVotoOpcaoId).toBeNull();
  });

  it('conta os votos por opção', () => {
    const votos = [
      { opcao_id: 'op-1', votante_id: 'a' },
      { opcao_id: 'op-1', votante_id: 'b' },
      { opcao_id: 'op-2', votante_id: 'c' },
    ];
    const resultado = calcularResultadoEnquete(opcoes, votos, 'a');
    expect(resultado.contagemPorOpcao).toEqual({ 'op-1': 2, 'op-2': 1, 'op-3': 0 });
    expect(resultado.totalVotos).toBe(3);
  });

  it('identifica o próprio voto entre os outros', () => {
    const votos = [
      { opcao_id: 'op-1', votante_id: 'outro' },
      { opcao_id: 'op-3', votante_id: 'eu' },
    ];
    expect(calcularResultadoEnquete(opcoes, votos, 'eu').meuVotoOpcaoId).toBe('op-3');
  });

  it('devolve null quando o usuário ainda não votou', () => {
    const votos = [{ opcao_id: 'op-1', votante_id: 'outro' }];
    expect(calcularResultadoEnquete(opcoes, votos, 'eu').meuVotoOpcaoId).toBeNull();
  });
});

describe('calcularPercentualOpcao', () => {
  it('devolve 0 sem crashar quando ninguém votou (0/0)', () => {
    expect(calcularPercentualOpcao(0, 0)).toBe(0);
  });

  it('calcula e arredonda a porcentagem', () => {
    expect(calcularPercentualOpcao(1, 3)).toBe(33);
    expect(calcularPercentualOpcao(2, 3)).toBe(67);
    expect(calcularPercentualOpcao(5, 10)).toBe(50);
  });
});
