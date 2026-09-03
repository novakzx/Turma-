import {
  deveDispararTrajeto,
  emLotes,
  filtrarDestinatarios,
  montarAvisoTrajeto,
  type PerfilDestinatario,
} from '../regras';

describe('filtrarDestinatarios (escopo de quem recebe um aviso — brief 6.1)', () => {
  const aluno: PerfilDestinatario = {
    id: '1',
    papel: 'aluno',
    escola_id: 'esc-1',
    turma_id: 'turma-1',
    push_token: 'token-1',
  };

  it('inclui aluno da turma quando o aviso é escopado pra turma', () => {
    expect(filtrarDestinatarios([aluno], { escola_id: 'esc-1', turma_id: 'turma-1' })).toEqual([
      aluno,
    ]);
  });

  it('exclui aluno de outra turma quando o aviso é escopado pra turma', () => {
    expect(filtrarDestinatarios([aluno], { escola_id: 'esc-1', turma_id: 'turma-2' })).toEqual([]);
  });

  it('inclui aluno de qualquer turma da escola quando o aviso é pra escola toda', () => {
    expect(filtrarDestinatarios([aluno], { escola_id: 'esc-1', turma_id: null })).toEqual([aluno]);
  });

  it('exclui aluno de outra escola mesmo com aviso pra escola toda', () => {
    const deOutraEscola = { ...aluno, escola_id: 'esc-2' };
    expect(filtrarDestinatarios([deOutraEscola], { escola_id: 'esc-1', turma_id: null })).toEqual(
      [],
    );
  });

  it('exclui professor e coordenacao — só aluno recebe push de aviso', () => {
    const professor: PerfilDestinatario = { ...aluno, papel: 'professor' };
    const coordenacao: PerfilDestinatario = { ...aluno, papel: 'coordenacao' };
    expect(
      filtrarDestinatarios([professor, coordenacao], { escola_id: 'esc-1', turma_id: null }),
    ).toEqual([]);
  });

  it('exclui aluno sem push_token salvo', () => {
    const semToken = { ...aluno, push_token: null };
    expect(filtrarDestinatarios([semToken], { escola_id: 'esc-1', turma_id: null })).toEqual([]);
  });
});

describe('deveDispararTrajeto (cálculo de push automático de clima — brief 6.1)', () => {
  const limites = { limiteChuvaPercentual: 70, limiteTemperaturaCelsius: 35 };

  it('dispara aviso de chuva quando a probabilidade bate o limite', () => {
    expect(deveDispararTrajeto({ precipitacaoMaxima: 70, temperaturaMaxima: 20 }, limites)).toBe(
      'chuva',
    );
  });

  it('dispara aviso de calor quando a temperatura bate o limite', () => {
    expect(deveDispararTrajeto({ precipitacaoMaxima: 10, temperaturaMaxima: 35 }, limites)).toBe(
      'calor',
    );
  });

  it('prioriza chuva quando os dois limites batem no mesmo dia', () => {
    expect(deveDispararTrajeto({ precipitacaoMaxima: 90, temperaturaMaxima: 40 }, limites)).toBe(
      'chuva',
    );
  });

  it('não dispara nada quando nenhum limite bate', () => {
    expect(
      deveDispararTrajeto({ precipitacaoMaxima: 20, temperaturaMaxima: 25 }, limites),
    ).toBeNull();
  });

  it('respeita limites diferentes por escola em vez de um valor fixo', () => {
    const maisSensivel = { limiteChuvaPercentual: 30, limiteTemperaturaCelsius: 25 };
    expect(
      deveDispararTrajeto({ precipitacaoMaxima: 40, temperaturaMaxima: 20 }, maisSensivel),
    ).toBe('chuva');
    expect(deveDispararTrajeto({ precipitacaoMaxima: 40, temperaturaMaxima: 20 }, limites)).toBe(
      null,
    );
  });
});

describe('montarAvisoTrajeto', () => {
  it('usa o texto de chuva confirmado com o usuário', () => {
    expect(montarAvisoTrajeto('chuva')).toEqual({
      titulo: 'Trajeto: chuva forte prevista',
      descricao:
        'Previsão indica risco no caminho até a escola hoje. Redobre a atenção ao se deslocar.',
    });
  });

  it('usa o texto de calor confirmado com o usuário', () => {
    expect(montarAvisoTrajeto('calor').titulo).toBe('Trajeto: calor extremo previsto');
  });
});

describe('emLotes', () => {
  it('divide em lotes de até 100 (limite da Expo Push API)', () => {
    const itens = Array.from({ length: 250 }, (_, i) => i);
    const lotes = emLotes(itens);
    expect(lotes).toHaveLength(3);
    expect(lotes[0]).toHaveLength(100);
    expect(lotes[1]).toHaveLength(100);
    expect(lotes[2]).toHaveLength(50);
  });

  it('devolve um lote só quando cabe tudo', () => {
    expect(emLotes([1, 2, 3])).toEqual([[1, 2, 3]]);
  });
});
