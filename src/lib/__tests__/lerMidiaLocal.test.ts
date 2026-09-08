import { lerBytesDeMidiaLocal } from '../lerMidiaLocal';

describe('lerBytesDeMidiaLocal', () => {
  it('lê os bytes direto do File (web), sem chamar fetch', async () => {
    const fetchEspiao = jest.spyOn(globalThis, 'fetch');
    const arquivo = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });

    const resultado = await lerBytesDeMidiaLocal('blob:http://localhost/abc', arquivo);

    expect(new Uint8Array(resultado.arrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
    expect(resultado.contentType).toBe('image/png');
    expect(fetchEspiao).not.toHaveBeenCalled();
    fetchEspiao.mockRestore();
  });

  it('cai pro application/octet-stream quando o File não tem type', async () => {
    const arquivo = new File([new Uint8Array([9])], 'sem-tipo', { type: '' });

    const resultado = await lerBytesDeMidiaLocal('blob:http://localhost/abc', arquivo);

    expect(resultado.contentType).toBe('application/octet-stream');
  });

  it('sem File (native), busca por fetch(uri) e lê o content-type da resposta', async () => {
    const respostaFake = {
      arrayBuffer: () => Promise.resolve(new Uint8Array([4, 5, 6]).buffer),
      headers: { get: () => 'image/jpeg' },
    };
    const fetchEspiao = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respostaFake as unknown as Response);

    const resultado = await lerBytesDeMidiaLocal('file:///caminho/foto.jpg', null);

    expect(fetchEspiao).toHaveBeenCalledWith('file:///caminho/foto.jpg');
    expect(new Uint8Array(resultado.arrayBuffer)).toEqual(new Uint8Array([4, 5, 6]));
    expect(resultado.contentType).toBe('image/jpeg');
    fetchEspiao.mockRestore();
  });

  it('sem content-type nenhum na resposta, cai pro application/octet-stream', async () => {
    const respostaFake = {
      arrayBuffer: () => Promise.resolve(new Uint8Array([]).buffer),
      headers: { get: () => null },
    };
    const fetchEspiao = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respostaFake as unknown as Response);

    const resultado = await lerBytesDeMidiaLocal('file:///caminho/sem-tipo', undefined);

    expect(resultado.contentType).toBe('application/octet-stream');
    fetchEspiao.mockRestore();
  });
});
