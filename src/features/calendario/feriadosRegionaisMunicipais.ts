/**
 * Feriados regionais (Regiões Autónomas) e municipais de Portugal —
 * gerados por fórmula, ao contrário da lista curada de `feriados.ts`
 * (essa vem do Despacho anual do Ministério da Educação, uma decisão
 * administrativa que não dá pra calcular). Portado da lógica de
 * `pt-calendar.js` do projeto de referência que o usuário mandou
 * (`TurmaTestes-main`) — mesma fonte (algoritmo de Meeus/Jones/Butcher
 * pra Páscoa) e mesma lista curada de feriados municipais.
 *
 * Município/distrito do aluno não é um dado que o Turma+ guarda hoje
 * (`profiles` não tem essa coluna) — não dá pra filtrar só o feriado da
 * cidade de cada aluno sem inventar um dado que não existe. Por isso
 * aparecem todos, mas cada título já entra com a localidade escrita por
 * extenso (ex.: "Feriado municipal — Porto (São João)"), pra ficar claro
 * que não é um feriado nacional nem necessariamente o da escola de quem
 * está vendo.
 */
import type { EventoCalendario } from './regras';

function pascoaISO(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function somarDias(dataISO: string, quantidade: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

function dataFixa(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function feriadosRegionais(ano: number): EventoCalendario[] {
  const pascoa = pascoaISO(ano);
  return [
    {
      id: `regional-acores-${ano}`,
      titulo: 'Dia da Região Autónoma dos Açores',
      data: somarDias(pascoa, 50), // segunda-feira do Espírito Santo (Pentecostes)
      tipo: 'regional',
      descricao: 'Feriado regional só nos Açores — não é feriado no resto do país.',
    },
    {
      id: `regional-madeira-${ano}`,
      titulo: 'Dia da Região Autónoma da Madeira',
      data: dataFixa(ano, 7, 1),
      tipo: 'regional',
      descricao: 'Feriado regional só na Madeira — não é feriado no resto do país.',
    },
  ];
}

type FeriadoMunicipalBase = {
  municipio: string;
  distrito: string;
  nome: string;
  nota?: string;
} & ({ mes: number; dia: number } | { movel: 'ascensao' });

const FERIADOS_MUNICIPAIS: FeriadoMunicipalBase[] = [
  { municipio: 'Lisboa', distrito: 'Lisboa', mes: 6, dia: 13, nome: 'Santo António' },
  { municipio: 'Cascais', distrito: 'Lisboa', mes: 6, dia: 13, nome: 'Santo António' },
  { municipio: 'Sintra', distrito: 'Lisboa', mes: 6, dia: 29, nome: 'São Pedro' },
  { municipio: 'Porto', distrito: 'Porto', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Vila Nova de Gaia', distrito: 'Porto', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Braga', distrito: 'Braga', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Guimarães', distrito: 'Braga', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Coimbra', distrito: 'Coimbra', mes: 7, dia: 4, nome: 'Rainha Santa Isabel' },
  { municipio: 'Aveiro', distrito: 'Aveiro', mes: 5, dia: 12, nome: 'Santa Joana Princesa' },
  { municipio: 'Setúbal', distrito: 'Setúbal', mes: 9, dia: 15, nome: 'Bocage / Dia da Cidade' },
  { municipio: 'Almada', distrito: 'Setúbal', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Leiria', distrito: 'Leiria', mes: 5, dia: 22, nome: 'Dia da Cidade de Leiria' },
  { municipio: 'Santarém', distrito: 'Santarém', mes: 3, dia: 19, nome: 'São José' },
  { municipio: 'Viseu', distrito: 'Viseu', mes: 9, dia: 21, nome: 'São Mateus' },
  { municipio: 'Faro', distrito: 'Faro', mes: 9, dia: 7, nome: 'Dia do Município de Faro' },
  {
    municipio: 'Viana do Castelo',
    distrito: 'Viana do Castelo',
    mes: 8,
    dia: 20,
    nome: 'Nossa Senhora d’Agonia',
  },
  { municipio: 'Vila Real', distrito: 'Vila Real', mes: 5, dia: 13, nome: 'Dia da Cidade de Vila Real' },
  { municipio: 'Bragança', distrito: 'Bragança', mes: 8, dia: 22, nome: 'Dia da Cidade de Bragança' },
  { municipio: 'Elvas', distrito: 'Portalegre', mes: 1, dia: 14, nome: 'Batalha das Linhas de Elvas' },
  { municipio: 'Beja', distrito: 'Beja', movel: 'ascensao', nome: 'Quinta-feira da Ascensão (Dia da Espiga)' },
  { municipio: 'Mafra', distrito: 'Lisboa', movel: 'ascensao', nome: 'Quinta-feira da Ascensão (Dia da Espiga)' },
  { municipio: 'Funchal', distrito: 'Madeira', mes: 8, dia: 21, nome: 'Dia da Cidade do Funchal' },
  { municipio: 'Angra do Heroísmo', distrito: 'Açores', mes: 6, dia: 24, nome: 'São João' },
  { municipio: 'Horta', distrito: 'Açores', mes: 6, dia: 24, nome: 'São João' },
];

export function feriadosMunicipais(ano: number): EventoCalendario[] {
  const pascoa = pascoaISO(ano);
  return FERIADOS_MUNICIPAIS.map((f) => {
    const data = 'movel' in f ? somarDias(pascoa, 39) : dataFixa(ano, f.mes, f.dia);
    return {
      id: `municipal-${f.municipio.toLowerCase().replace(/\s+/g, '-')}-${ano}`,
      titulo: `Feriado municipal — ${f.municipio} (${f.nome})`,
      data,
      tipo: 'municipal',
      descricao: `Distrito de ${f.distrito}. Só é feriado nesse município — confirma se é o teu.`,
    } satisfies EventoCalendario;
  });
}

/** Todos os feriados regionais + municipais de um conjunto de anos —
 * conveniência pra quem quer cobrir mais de um ano letivo de uma vez
 * (ver uso em `(tabs)/index.tsx`). */
export function feriadosRegionaisEMunicipais(anos: number[]): EventoCalendario[] {
  return anos.flatMap((ano) => [...feriadosRegionais(ano), ...feriadosMunicipais(ano)]);
}
