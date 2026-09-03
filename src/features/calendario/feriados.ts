/**
 * Feriados nacionais + interrupções letivas do ano letivo 2026/2027
 * (Portugal). Substitui o mural de avisos na aba antiga "Avisos" —
 * decisão explícita do usuário (o mural, o botão de publicar e o
 * back-end de avisos/push continuam existindo no banco, só não têm mais
 * tela nenhuma no app; ver README > "Status atual").
 *
 * Fontes conferidas (não é data inventada): feriados nacionais fixos são
 * os do calendário civil português; os móveis (Sexta-feira Santa, Páscoa,
 * Corpo de Deus) foram calculados a partir da Páscoa de 2027 — 28 de
 * março, verificado pelo algoritmo de Meeus/Jones/Butcher e cruzado
 * contra o intervalo de interrupção letiva oficial da Páscoa (22 mar–2
 * abr) abaixo, que bate certinho (Sexta-feira Santa cai dentro do
 * intervalo). As interrupções letivas (Natal, Carnaval, Páscoa) e as
 * datas de início/fim do ano letivo vêm do Despacho n.º 8368/2024,
 * alterado pelo Despacho n.º 10430/2026 — conferido em mais de uma fonte
 * (ver commit que introduziu este arquivo).
 *
 * **Precisa de manutenção anual**: um novo despacho normativo sai todo
 * ano pro ano letivo seguinte — sem isso, esta lista fica desatualizada
 * a partir de setembro de 2027. Não dá pra calcular automaticamente (as
 * datas de início/fim de período e das interrupções são decisão
 * administrativa, não uma fórmula, ao contrário da Páscoa).
 */

export type TipoFeriado = 'nacional' | 'letivo';

export type FeriadoOuInterrupcao = {
  id: string;
  nome: string;
  tipo: TipoFeriado;
  /** Data única (feriado) — formato ISO `YYYY-MM-DD`. */
  data?: string;
  /** Intervalo (interrupção letiva de vários dias) — datas ISO inclusive. */
  inicio?: string;
  fim?: string;
  /** Só pra interrupções: quando as aulas voltam depois do intervalo. */
  regresso?: string;
  descricao?: string;
};

export const ANO_LETIVO = '2026/2027';

export const FERIADOS_E_INTERRUPCOES: FeriadoOuInterrupcao[] = [
  {
    id: 'inicio-ano-letivo',
    nome: 'Início do ano letivo',
    tipo: 'letivo',
    data: '2026-09-11',
    descricao: 'Pré-escolar e ensino básico (1.º–3.º ciclo); secundário começa a 21 de setembro.',
  },
  {
    id: 'implantacao-republica-2026',
    nome: 'Implantação da República',
    tipo: 'nacional',
    data: '2026-10-05',
  },
  {
    id: 'todos-os-santos-2026',
    nome: 'Dia de Todos os Santos',
    tipo: 'nacional',
    data: '2026-11-01',
  },
  {
    id: 'restauracao-independencia-2026',
    nome: 'Restauração da Independência',
    tipo: 'nacional',
    data: '2026-12-01',
  },
  {
    id: 'imaculada-conceicao-2026',
    nome: 'Imaculada Conceição',
    tipo: 'nacional',
    data: '2026-12-08',
  },
  {
    id: 'interrupcao-natal',
    nome: 'Interrupção letiva do Natal',
    tipo: 'letivo',
    inicio: '2026-12-16',
    fim: '2026-12-31',
    regresso: '2027-01-04',
  },
  { id: 'natal-2026', nome: 'Natal', tipo: 'nacional', data: '2026-12-25' },
  { id: 'ano-novo-2027', nome: 'Ano Novo', tipo: 'nacional', data: '2027-01-01' },
  {
    id: 'interrupcao-carnaval',
    nome: 'Interrupção letiva do Carnaval',
    tipo: 'letivo',
    inicio: '2027-02-08',
    fim: '2027-02-10',
    regresso: '2027-02-11',
    descricao: 'Terça-feira de Carnaval cai a 9 de fevereiro.',
  },
  {
    id: 'interrupcao-pascoa',
    nome: 'Interrupção letiva da Páscoa',
    tipo: 'letivo',
    inicio: '2027-03-22',
    fim: '2027-04-02',
    regresso: '2027-04-05',
    descricao: 'Sexta-feira Santa (26 mar) e Domingo de Páscoa (28 mar) caem dentro do intervalo.',
  },
  { id: 'liberdade-2027', nome: 'Dia da Liberdade', tipo: 'nacional', data: '2027-04-25' },
  { id: 'trabalhador-2027', nome: 'Dia do Trabalhador', tipo: 'nacional', data: '2027-05-01' },
  { id: 'corpo-de-deus-2027', nome: 'Corpo de Deus', tipo: 'nacional', data: '2027-05-27' },
  {
    id: 'fim-ano-letivo-9-11-12',
    nome: 'Fim das aulas — 9.º, 11.º e 12.º anos',
    tipo: 'letivo',
    data: '2027-06-04',
  },
  { id: 'dia-de-portugal-2027', nome: 'Dia de Portugal', tipo: 'nacional', data: '2027-06-10' },
  {
    id: 'fim-ano-letivo-5-a-10',
    nome: 'Fim das aulas — 5.º ao 8.º e 10.º anos',
    tipo: 'letivo',
    data: '2027-06-11',
  },
  {
    id: 'fim-ano-letivo-pre-1ciclo',
    nome: 'Fim das aulas — pré-escolar e 1.º ciclo',
    tipo: 'letivo',
    data: '2027-06-30',
  },
];

function primeiraData(item: FeriadoOuInterrupcao): string {
  return item.data ?? item.inicio ?? '';
}

/** Lista ordenada por data — a fonte acima já nasce em ordem cronológica,
 * mas ordenar de novo aqui evita depender de manter a lista arrumada à
 * mão pra sempre. */
export function listarOrdenados(): FeriadoOuInterrupcao[] {
  return [...FERIADOS_E_INTERRUPCOES].sort((a, b) =>
    primeiraData(a).localeCompare(primeiraData(b)),
  );
}

/** O próximo feriado/interrupção a partir de `hoje` (default: agora) —
 * usa a data de início pra interrupções, já que é o que importa saber
 * "quando começa". */
export function proximoEvento(hoje: Date = new Date()): FeriadoOuInterrupcao | null {
  const hojeISO = hoje.toISOString().slice(0, 10);
  return listarOrdenados().find((item) => primeiraData(item) >= hojeISO) ?? null;
}

/** Dias corridos entre hoje e a data de início do evento (>= 0 quando já
 * passou, tratado por quem chama — aqui só a diferença de calendário). */
export function diasAte(dataISO: string, hoje: Date = new Date()): number {
  const hojeSoData = new Date(hoje.toISOString().slice(0, 10));
  const alvo = new Date(dataISO);
  const diffMs = alvo.getTime() - hojeSoData.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
