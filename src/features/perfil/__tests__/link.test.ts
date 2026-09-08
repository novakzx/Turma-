import { formatarLinkExibicao, normalizarLinkPerfil } from '../link';

describe('normalizarLinkPerfil', () => {
  it('campo vazio é válido (limpa o link)', () => {
    expect(normalizarLinkPerfil('')).toEqual({ ok: true, link: '' });
    expect(normalizarLinkPerfil('   ')).toEqual({ ok: true, link: '' });
  });

  it('aceita sem protocolo e completa com https', () => {
    const r = normalizarLinkPerfil('instagram.com/mariateste');
    expect(r).toEqual({ ok: true, link: 'https://instagram.com/mariateste' });
  });

  it('mantém http quando já vem explícito', () => {
    const r = normalizarLinkPerfil('http://meusite.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.link.startsWith('http://')).toBe(true);
  });

  it('rejeita esquema perigoso (javascript:)', () => {
    const r = normalizarLinkPerfil('javascript:alert(1)');
    expect(r.ok).toBe(false);
  });

  it('rejeita domínio sem ponto (não é um link de verdade)', () => {
    const r = normalizarLinkPerfil('naoeumdominio');
    expect(r.ok).toBe(false);
  });

  it('rejeita link maior que 200 caracteres', () => {
    const r = normalizarLinkPerfil(`https://exemplo.com/${'a'.repeat(200)}`);
    expect(r.ok).toBe(false);
  });
});

describe('formatarLinkExibicao', () => {
  it('tira o protocolo e a barra final', () => {
    expect(formatarLinkExibicao('https://instagram.com/mariateste/')).toBe(
      'instagram.com/mariateste',
    );
    expect(formatarLinkExibicao('http://meusite.com')).toBe('meusite.com');
  });
});
