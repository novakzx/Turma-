// Lógica pura (sem import de Deno/Supabase) por trás das duas Edge
// Functions da Fase 2. Fica separada dos entrypoints (index.ts) só pra
// poder ser testada com Jest — os entrypoints em si rodam em Deno e não
// passam pelo runner de teste do projeto React Native.

export type PapelUsuario = 'aluno' | 'professor' | 'coordenacao';

export type PerfilDestinatario = {
  id: string;
  papel: PapelUsuario;
  escola_id: string | null;
  turma_id: string | null;
  push_token: string | null;
};

export type AvisoEscopo = {
  escola_id: string;
  turma_id: string | null;
};

/**
 * Escopo de quem recebe um aviso (brief 6.1): `turma_id` nulo no aviso =
 * escola toda; preenchido = só aquela turma. Só professor/coordenacao
 * publica aviso — só aluno recebe push dele (brief: "Só
 * professor/coordenacao publica; aluno recebe push"). Sem token salvo,
 * não tem pra onde mandar.
 */
export function filtrarDestinatarios(
  perfis: PerfilDestinatario[],
  aviso: AvisoEscopo,
): PerfilDestinatario[] {
  return perfis.filter(
    (p) =>
      p.papel === 'aluno' &&
      !!p.push_token &&
      p.escola_id === aviso.escola_id &&
      (aviso.turma_id === null || p.turma_id === aviso.turma_id),
  );
}

export type PrevisaoDia = {
  /** % de chance de chuva no dia (0-100). */
  precipitacaoMaxima: number;
  /** Temperatura máxima prevista, em °C. */
  temperaturaMaxima: number;
};

export type LimitesEscola = {
  limiteChuvaPercentual: number;
  limiteTemperaturaCelsius: number;
};

export type TipoTrajeto = 'chuva' | 'calor' | null;

/**
 * Decide se a previsão do dia justifica o aviso automático de trajeto
 * (brief 6.1), usando o limite configurável de cada escola — nunca um
 * valor fixo no código. Quando os dois limites batem no mesmo dia, o
 * aviso final fala de chuva: é o risco mais imediato pra quem já está a
 * caminho (a pé, de bicicleta, esperando transporte ao ar livre).
 */
export function deveDispararTrajeto(previsao: PrevisaoDia, limites: LimitesEscola): TipoTrajeto {
  if (previsao.precipitacaoMaxima >= limites.limiteChuvaPercentual) return 'chuva';
  if (previsao.temperaturaMaxima >= limites.limiteTemperaturaCelsius) return 'calor';
  return null;
}

/** Texto do aviso automático — confirmado com o usuário, não é um chute. */
export function montarAvisoTrajeto(tipo: Exclude<TipoTrajeto, null>): {
  titulo: string;
  descricao: string;
} {
  const titulo =
    tipo === 'chuva' ? 'Trajeto: chuva forte prevista' : 'Trajeto: calor extremo previsto';
  return {
    titulo,
    descricao:
      'Previsão indica risco no caminho até a escola hoje. Redobre a atenção ao se deslocar.',
  };
}

/** Expo Push aceita no máximo 100 mensagens por request — divide em lotes. */
export function emLotes<T>(itens: T[], tamanho = 100): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}
