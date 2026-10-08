import type { Review } from '../types';

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const dois = (n: number) => String(n).padStart(2, '0');

// "2026-10-04" no fuso local
export const chaveDia = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
};

export const chaveDiaDe = (ano: number, mes: number, dia: number): string =>
  `${ano}-${dois(mes + 1)}-${dois(dia)}`;

export function agruparPorDia(reviews: Review[]): Record<string, Review[]> {
  const mapa: Record<string, Review[]> = {};
  for (const r of reviews) {
    const k = chaveDia(r.visitedAt);
    if (!mapa[k]) mapa[k] = [];
    mapa[k].push(r);
  }
  return mapa;
}

// Células do calendário: vazios no começo + dias do mês
export function celulasDoMes(ano: number, mes: number): (number | null)[] {
  const primeiro = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = Array(primeiro).fill(null);
  for (let d = 1; d <= total; d++) celulas.push(d);
  return celulas;
}
