// Leitura do horário no formato do OpenStreetMap (opening_hours) para o detalhe do lugar.
// Cobre os casos comuns ("Mo-Fr 10:00-22:00; Sa 10:00-14:00; Su off", "24/7").
// O que não der para entender volta null e a tela mostra o texto como veio.

const DIAS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ABREV = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

/** Faixas em minutos desde 0h; fim pode passar de 1440 quando vira a madrugada. */
export type Semana = [number, number][][];

function minutos(h: string): number | null {
  const m = h.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v <= 24 * 60 ? v : null;
}

function lerDias(texto: string): number[] | null {
  const dias: number[] = [];
  for (const parte of texto.split(',')) {
    const [a, b] = parte.split('-');
    const i = DIAS.indexOf(a);
    if (i < 0) return null;
    if (!b) {
      dias.push(i);
      continue;
    }
    const j = DIAS.indexOf(b);
    if (j < 0) return null;
    for (let k = i; ; k = (k + 1) % 7) {
      dias.push(k);
      if (k === j) break;
    }
  }
  return dias;
}

export function lerHorario(texto?: string): Semana | null {
  if (!texto) return null;
  const t = texto.trim();
  if (t === '24/7') return DIAS.map(() => [[0, 24 * 60]]);
  const semana: Semana = DIAS.map(() => []);
  for (const regraBruta of t.split(';')) {
    const regra = regraBruta.trim().replace(/\s*PH\s*(off)?\s*,?/g, '').trim();
    if (!regra) continue;
    const m = regra.match(/^([A-Za-z,-]+)?\s*(.*)$/);
    if (!m) return null;
    const dias = m[1] ? lerDias(m[1]) : [0, 1, 2, 3, 4, 5, 6];
    if (!dias) return null;
    const resto = m[2].trim();
    if (resto === 'off' || resto === 'closed') {
      dias.forEach((d) => (semana[d] = []));
      continue;
    }
    const faixas: [number, number][] = [];
    for (const f of resto.split(',')) {
      const [ini, fim] = f.trim().split('-');
      const a = minutos(ini ?? '');
      let b = minutos(fim ?? '');
      if (a === null || b === null) return null;
      if (b <= a) b += 24 * 60;
      faixas.push([a, b]);
    }
    // regra mais abaixo substitui a de cima para os mesmos dias, como no OSM
    dias.forEach((d) => (semana[d] = faixas));
  }
  return semana;
}

const hora = (min: number) => {
  const m = min % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const faixasDoDia = (faixas: [number, number][]) =>
  faixas.length === 0 ? 'Fechado' : faixas.map(([a, b]) => (b - a >= 24 * 60 ? '24 horas' : `${hora(a)}–${hora(b)}`)).join(', ');

/** "Aberto · Fecha às 22:00" ou "Fechado · Abre sex. às 10:00". */
export function situacaoAgora(semana: Semana, agora = new Date()): { aberto: boolean; texto: string } {
  const dia = agora.getDay();
  const min = agora.getHours() * 60 + agora.getMinutes();
  const ontem = (dia + 6) % 7;
  // faixa de ontem que entrou na madrugada de hoje
  for (const [, b] of semana[ontem]) {
    if (b > 24 * 60 && min < b - 24 * 60) return { aberto: true, texto: `Fecha às ${hora(b)}` };
  }
  for (const [a, b] of semana[dia]) {
    if (min >= a && min < b) return { aberto: true, texto: b - a >= 24 * 60 ? 'Aberto 24 horas' : `Fecha às ${hora(b)}` };
  }
  for (let k = 0; k < 7; k++) {
    const d = (dia + k) % 7;
    const proxima = semana[d].map(([a]) => a).filter((a) => k > 0 || a > min).sort((x, y) => x - y)[0];
    if (proxima !== undefined) {
      return { aberto: false, texto: k === 0 ? `Abre às ${hora(proxima)}` : `Abre ${k === 1 ? 'amanhã' : ABREV[d]} às ${hora(proxima)}` };
    }
  }
  return { aberto: false, texto: 'Sem horário de abertura' };
}
