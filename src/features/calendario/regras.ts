import type { FeriadoOuInterrupcao } from './feriados';

/**
 * Calendário integrado (pedido do usuário): junta feriados/interrupções
 * letivas com as avaliações do próprio aluno (data marcada) numa única
 * lista ordenada — em vez de duas telas separadas pra "quando tem prova"
 * e "quando não tem aula".
 */
export type EventoCalendario = {
  id: string;
  titulo: string;
  /** Data única, ISO `YYYY-MM-DD` — evento de intervalo usa a data de
   * início (mesma convenção já usada em `feriados.ts`) pra ordenar; `fim`
   * (opcional) guarda o fim de verdade só pra exibição. */
  data: string;
  fim?: string;
  regresso?: string;
  tipo: 'nacional' | 'letivo' | 'avaliacao';
  descricao?: string;
};

export type AvaliacaoParaCalendario = {
  id: string;
  nome: string;
  data: string | null;
  materiaNome?: string | null;
};

function primeiraData(item: FeriadoOuInterrupcao): string {
  return item.data ?? item.inicio ?? '';
}

export function mesclarEventos(
  feriados: FeriadoOuInterrupcao[],
  avaliacoes: AvaliacaoParaCalendario[],
): EventoCalendario[] {
  const eventosFeriados: EventoCalendario[] = feriados.map((f) => ({
    id: f.id,
    titulo: f.nome,
    data: primeiraData(f),
    fim: f.fim,
    regresso: f.regresso,
    tipo: f.tipo,
    descricao: f.descricao,
  }));

  const eventosAvaliacoes: EventoCalendario[] = avaliacoes
    .filter((a): a is AvaliacaoParaCalendario & { data: string } => !!a.data)
    .map((a) => ({
      id: a.id,
      titulo: a.materiaNome ? `${a.nome} — ${a.materiaNome}` : a.nome,
      data: a.data,
      tipo: 'avaliacao',
    }));

  return [...eventosFeriados, ...eventosAvaliacoes].sort((a, b) => a.data.localeCompare(b.data));
}

/** Formata uma data ISO (`YYYY-MM-DD`) pro formato exigido pelo `DTSTART`
 * de um evento de dia inteiro no formato ICS (`YYYYMMDD`, sem hífen). */
function paraDataIcs(dataISO: string): string {
  return dataISO.replaceAll('-', '');
}

/** Escapa vírgula/ponto-e-vírgula/quebra de linha — os únicos caracteres
 * que o formato ICS exige escapar em campos de texto (RFC 5545 §3.3.11). */
function escaparTextoIcs(texto: string): string {
  return texto.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

/** Gera um arquivo `.ics` (iCalendar) mínimo, mas válido, com um evento
 * de dia inteiro por item — pra exportar pro calendário do celular
 * (pedido do usuário). Sem dependência nenhuma: o formato é texto simples
 * o bastante pra montar à mão sem lib. */
export function gerarIcs(eventos: EventoCalendario[]): string {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Turma+//Calendario//PT',
    'CALSCALE:GREGORIAN',
  ];

  for (const evento of eventos) {
    linhas.push(
      'BEGIN:VEVENT',
      `UID:${evento.id}@turmamais.app`,
      `DTSTART;VALUE=DATE:${paraDataIcs(evento.data)}`,
      `SUMMARY:${escaparTextoIcs(evento.titulo)}`,
    );
    if (evento.descricao) {
      linhas.push(`DESCRIPTION:${escaparTextoIcs(evento.descricao)}`);
    }
    linhas.push('END:VEVENT');
  }

  linhas.push('END:VCALENDAR');
  // ICS exige quebra de linha CRLF — alguns apps de calendário (Outlook,
  // sobretudo) recusam o arquivo silenciosamente com só `\n`.
  return linhas.join('\r\n');
}
