import { mensagemDeErro } from '../errors';

describe('mensagemDeErro', () => {
  it('traduz uma mensagem conhecida do Supabase Auth', () => {
    expect(mensagemDeErro(new Error('Invalid login credentials'))).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('extrai a mensagem de um erro do supabase-js que não é instanceof Error', () => {
    // PostgrestError/AuthError do supabase-js são objetos simples com
    // `.message`, não instâncias de Error — é exatamente o bug real que
    // isso corrige: sem o `in` check, virava a string "[object Object]".
    const erroSupabase = { message: 'permission denied for table profiles', code: '42501' };

    expect(mensagemDeErro(erroSupabase)).toBe('permission denied for table profiles');
  });

  it('devolve a mensagem original quando não há tradução mapeada', () => {
    expect(mensagemDeErro(new Error('Algo bem específico do backend'))).toBe(
      'Algo bem específico do backend',
    );
  });

  it('não quebra com um valor totalmente inesperado (string solta)', () => {
    expect(mensagemDeErro('falha genérica')).toBe('falha genérica');
  });
});
