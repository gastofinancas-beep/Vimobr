import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getLocalReviews } from './reviews';
import type { Clube, ClubeMembro, Review } from '../types';

const LS_CLUBES_KEY = 'vimo_clubes_v1';

function lerLocais(): Clube[] {
  try {
    const raw = localStorage.getItem(LS_CLUBES_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarLocais(clubes: Clube[]) {
  try {
    localStorage.setItem(LS_CLUBES_KEY, JSON.stringify(clubes));
  } catch {}
}

function substituirLocal(clube: Clube) {
  const lista = lerLocais();
  const i = lista.findIndex((c) => c.id === clube.id);
  if (i >= 0) lista[i] = clube;
  else lista.unshift(clube);
  salvarLocais(lista);
}

/** Grava no servidor em segundo plano; o Firestore pode lançar erro síncrono (ex.: campo vazio). */
function sincronizar(gravar: () => Promise<unknown>) {
  if (!isFirebaseConfigured) return;
  try {
    gravar().catch(() => {});
  } catch {}
}

export function clubesLocais(): Clube[] {
  return lerLocais();
}

export function meusClubesLocais(uid: string): Clube[] {
  return lerLocais().filter((c) => c.membrosUids.includes(uid));
}

export function ehMembro(clube: Clube, uid: string): boolean {
  return clube.membrosUids.includes(uid);
}

export async function carregarClubes(): Promise<Clube[]> {
  const locais = lerLocais();
  if (!isFirebaseConfigured) return locais;
  try {
    const snap = await comPrazo(getDocs(query(collection(db, 'clubes'), limit(200))));
    const remotos = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Clube));
    const mapa = new Map<string, Clube>();
    for (const c of locais) mapa.set(c.id, c);
    for (const c of remotos) mapa.set(c.id, c);
    const lista = [...mapa.values()];
    salvarLocais(lista);
    return lista;
  } catch {
    return locais;
  }
}

export async function criarClube(
  autor: Omit<ClubeMembro, 'entrouEm'>,
  dados: { nome: string; descricao: string; cidade?: string },
): Promise<Clube> {
  const agora = Date.now();
  const clube: Clube = {
    id: crypto.randomUUID(),
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    criadorUid: autor.uid,
    membros: { [autor.uid]: { ...autor, entrouEm: agora } },
    membrosUids: [autor.uid],
    createdAt: agora,
  };
  if (dados.cidade?.trim()) clube.cidade = dados.cidade.trim();

  substituirLocal(clube);
  sincronizar(() => {
    const { id, ...campos } = clube;
    return setDoc(doc(db, 'clubes', id), campos);
  });
  return clube;
}

export async function entrarNoClube(clube: Clube, membro: Omit<ClubeMembro, 'entrouEm'>): Promise<Clube> {
  const novo: ClubeMembro = { ...membro, entrouEm: Date.now() };
  const atualizado: Clube = {
    ...clube,
    membros: { ...clube.membros, [membro.uid]: novo },
    membrosUids: [...new Set([...clube.membrosUids, membro.uid])],
  };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'clubes', clube.id), {
      [`membros.${membro.uid}`]: novo,
      membrosUids: arrayUnion(membro.uid),
    }),
  );
  return atualizado;
}

export async function sairDoClube(clube: Clube, uid: string): Promise<Clube> {
  const membros = { ...clube.membros };
  delete membros[uid];
  const atualizado: Clube = {
    ...clube,
    membros,
    membrosUids: clube.membrosUids.filter((u) => u !== uid),
  };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'clubes', clube.id), {
      [`membros.${uid}`]: deleteField(),
      membrosUids: arrayRemove(uid),
    }),
  );
  return atualizado;
}

// ---------- Competição: idas no mês ----------

export function inicioDoMes(data = new Date()): number {
  return new Date(data.getFullYear(), data.getMonth(), 1).getTime();
}

export function nomeDoMes(data = new Date()): string {
  return data.toLocaleDateString('pt-BR', { month: 'long' });
}

/** Rede lenta não pode travar a tela: desiste depois do prazo. */
function comPrazo<T>(promessa: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rejeitar) => setTimeout(() => rejeitar(new Error('prazo')), ms)),
  ]);
}

function reviewsLocaisDesde(uids: string[], desde: number): Review[] {
  const alvo = new Set(uids);
  return getLocalReviews().filter((r) => alvo.has(r.uid) && r.visitedAt >= desde);
}

async function reviewsDesde(uids: string[], desde: number): Promise<Review[]> {
  const mapa = new Map<string, Review>();
  for (const r of reviewsLocaisDesde(uids, desde)) mapa.set(r.id, r);
  if (isFirebaseConfigured && uids.length > 0) {
    try {
      const blocos: string[][] = [];
      for (let i = 0; i < uids.length; i += 30) blocos.push(uids.slice(i, i + 30));
      const snaps = await comPrazo(
        Promise.all(blocos.map((b) => getDocs(query(collection(db, 'reviews'), where('uid', 'in', b), limit(500))))),
      );
      for (const s of snaps) {
        for (const d of s.docs) {
          const r = { ...d.data(), id: d.id } as Review;
          if (r.visitedAt >= desde) mapa.set(r.id, r);
        }
      }
    } catch {}
  }
  return [...mapa.values()];
}

export interface PlacarMembro {
  membro: ClubeMembro;
  idas: number;
  lugares: number;
}

export interface PlacarClube {
  clube: Clube;
  idas: number;
  lugares: number;
}

function contar(reviews: Review[], uids: string[]) {
  const doGrupo = reviews.filter((r) => uids.includes(r.uid));
  return { idas: doGrupo.length, lugares: new Set(doGrupo.map((r) => r.placeId)).size };
}

function ordenarClubes(clubes: Clube[], reviews: Review[]): PlacarClube[] {
  return clubes
    .map((clube) => ({ clube, ...contar(reviews, clube.membrosUids) }))
    .sort((a, b) => b.idas - a.idas || b.lugares - a.lugares || b.clube.membrosUids.length - a.clube.membrosUids.length);
}

/** Placar imediato com as idas salvas no aparelho. */
export function rankingLocalDosClubes(clubes: Clube[]): PlacarClube[] {
  const todos = [...new Set(clubes.flatMap((c) => c.membrosUids))];
  return ordenarClubes(clubes, reviewsLocaisDesde(todos, inicioDoMes()));
}

/** Ranking entre clubes: soma das idas dos membros no mês. */
export async function rankingDosClubes(clubes: Clube[]): Promise<PlacarClube[]> {
  const todos = [...new Set(clubes.flatMap((c) => c.membrosUids))];
  return ordenarClubes(clubes, await reviewsDesde(todos, inicioDoMes()));
}

/** Ranking interno: quem do clube mais visitou no mês. */
export async function rankingDoClube(clube: Clube): Promise<PlacarMembro[]> {
  const reviews = await reviewsDesde(clube.membrosUids, inicioDoMes());
  return Object.values(clube.membros)
    .map((membro) => ({ membro, ...contar(reviews, [membro.uid]) }))
    .sort((a, b) => b.idas - a.idas || b.lugares - a.lugares);
}
