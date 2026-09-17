import { calcularSequenciaConversa } from '../regras';

describe('calcularSequenciaConversa (foguinho entre amigos, tipo TikTok)', () => {
  const AGORA = new Date(2026, 8, 17, 15, 0, 0); // 17/set/2026, meio da tarde
  const A = 'aluno-a';
  const B = 'aluno-b';

  function msg(autor: string, diasAtras: number) {
    return { autor_id: autor, criado_em: new Date(2026, 8, 17 - diasAtras, 12, 0, 0).toISOString() };
  }

  it('devolve 0 sem nenhuma mensagem', () => {
    expect(calcularSequenciaConversa([], A, B, AGORA)).toBe(0);
  });

  it('conta os dias em que os dois mandaram mensagem', () => {
    const mensagens = [
      msg(A, 0),
      msg(B, 0),
      msg(A, 1),
      msg(B, 1),
      msg(A, 2),
      msg(B, 2),
    ];
    expect(calcularSequenciaConversa(mensagens, A, B, AGORA)).toBe(3);
  });

  it('não conta um dia em que só uma pessoa mandou mensagem', () => {
    const mensagens = [msg(A, 0), msg(B, 0), msg(A, 1) /* B não mandou no dia 1 */];
    expect(calcularSequenciaConversa(mensagens, A, B, AGORA)).toBe(1);
  });

  it('continua "viva" se hoje ainda não teve mensagem de nenhum dos dois mas ontem teve dos dois', () => {
    const mensagens = [msg(A, 1), msg(B, 1), msg(A, 2), msg(B, 2)];
    expect(calcularSequenciaConversa(mensagens, A, B, AGORA)).toBe(2);
  });

  it('zera quando nem hoje nem ontem tiveram mensagem dos dois', () => {
    const mensagens = [msg(A, 2), msg(B, 2)];
    expect(calcularSequenciaConversa(mensagens, A, B, AGORA)).toBe(0);
  });

  it('várias mensagens da mesma pessoa no mesmo dia contam como uma só presença', () => {
    const mensagens = [msg(A, 0), msg(A, 0), msg(A, 0), msg(B, 0)];
    expect(calcularSequenciaConversa(mensagens, A, B, AGORA)).toBe(1);
  });
});
