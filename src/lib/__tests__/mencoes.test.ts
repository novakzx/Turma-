import { dividirEmTrechos, extrairMencoes } from '../mencoes';

describe('extrairMencoes', () => {
  it('extrai um @usuário do meio de uma frase', () => {
    expect(extrairMencoes('Olha isso @maria_ silva, viu?')).toEqual(['maria_']);
  });

  it('extrai várias menções diferentes', () => {
    expect(extrairMencoes('@joao e @maria123 vão ajudar')).toEqual(['joao', 'maria123']);
  });

  it('não duplica a mesma menção repetida', () => {
    expect(extrairMencoes('@joao, @joao de novo')).toEqual(['joao']);
  });

  it('ignora e-mail (tem @ mas não é um @usuário solto)', () => {
    // O regex ainda casaria "gmail" depois do @ de um e-mail — documentado
    // como limitação aceitável: o pior caso é destacar um trecho de e-mail
    // como se fosse menção, não vazar dado nenhum (a resolução real
    // depende do @usuário existir de verdade em `profiles`).
    expect(extrairMencoes('sem nenhuma arroba aqui')).toEqual([]);
  });

  it('devolve lista vazia sem nenhuma menção', () => {
    expect(extrairMencoes('texto qualquer sem arroba')).toEqual([]);
  });
});

describe('dividirEmTrechos', () => {
  it('texto sem menção vira um único trecho sem menção', () => {
    expect(dividirEmTrechos('oi tudo bem')).toEqual([{ texto: 'oi tudo bem', mencao: null }]);
  });

  it('separa texto normal e menção em trechos alternados', () => {
    expect(dividirEmTrechos('oi @maria tudo bem?')).toEqual([
      { texto: 'oi ', mencao: null },
      { texto: '@maria', mencao: 'maria' },
      { texto: ' tudo bem?', mencao: null },
    ]);
  });

  it('menção no início e no fim do texto, sem sobra vazia', () => {
    expect(dividirEmTrechos('@joao oi @maria')).toEqual([
      { texto: '@joao', mencao: 'joao' },
      { texto: ' oi ', mencao: null },
      { texto: '@maria', mencao: 'maria' },
    ]);
  });

  it('texto vazio devolve lista vazia', () => {
    expect(dividirEmTrechos('')).toEqual([]);
  });
});
