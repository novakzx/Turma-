import { mesclarCurtidas } from '../regras';
import type { CurtidaRecebida } from '../types';

const perfil = { id: 'p1', nome: 'Ana', nome_usuario: 'ana', foto_url: null };

function curtida(id: string, criadoEm: string, tipo: 'post' | 'story'): CurtidaRecebida {
  return { id, criadoEm, tipo, itemId: `item-${id}`, autor: perfil };
}

describe('mesclarCurtidas', () => {
  it('junta curtidas de post e de story numa lista só', () => {
    const posts = [curtida('1', '2026-01-01T10:00:00Z', 'post')];
    const stories = [curtida('2', '2026-01-01T11:00:00Z', 'story')];
    const resultado = mesclarCurtidas(posts, stories);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((c) => c.id)).toEqual(['2', '1']);
  });

  it('ordena por data, mais recente primeiro, misturando os dois tipos', () => {
    const posts = [
      curtida('antiga', '2026-01-01T08:00:00Z', 'post'),
      curtida('nova', '2026-01-03T08:00:00Z', 'post'),
    ];
    const stories = [curtida('meio', '2026-01-02T08:00:00Z', 'story')];
    const resultado = mesclarCurtidas(posts, stories);
    expect(resultado.map((c) => c.id)).toEqual(['nova', 'meio', 'antiga']);
  });

  it('lida com listas vazias sem quebrar', () => {
    expect(mesclarCurtidas([], [])).toEqual([]);
    expect(mesclarCurtidas([curtida('1', '2026-01-01T00:00:00Z', 'post')], [])).toHaveLength(1);
  });
});
