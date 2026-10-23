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
import { comPrazo, sincronizar } from './clubes';
import { getLocalReviews } from './reviews';
import { notificarVarios } from './notifications';
import { SAMPLE_PLACES, MEMORY_PLACES_CACHE } from './places';
import type { Clube, Evento, EventoParticipante } from '../types';

const LS_EVENTOS_KEY = 'vimo_eventos_v1';

function lerLocais(): Evento[] {
  try {
    const lista = JSON.parse(localStorage.getItem(LS_EVENTOS_KEY) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarLocais(eventos: Evento[]) {
  try {
    localStorage.setItem(LS_EVENTOS_KEY, JSON.stringify(eventos));
  } catch {}
}

function substituirLocal(evento: Evento) {
  const lista = lerLocais().filter((e) => e.id !== evento.id);
  salvarLocais([evento, ...lista]);
}

export function eventosLocais(clubeIds: string[]): Evento[] {
  const ids = new Set(clubeIds);
  return lerLocais()
    .filter((e) => ids.has(e.clubeId))
    .sort((a, b) => a.data - b.data);
}

export async function carregarEventos(clubeIds: string[]): Promise<Evento[]> {
  const locais = eventosLocais(clubeIds);
  if (!isFirebaseConfigured || clubeIds.length === 0) return locais;
  try {
    const blocos: string[][] = [];
    for (let i = 0; i < clubeIds.length; i += 30) blocos.push(clubeIds.slice(i, i + 30));
    const snaps = await comPrazo(
      Promise.all(blocos.map((b) => getDocs(query(collection(db, 'eventos'), where('clubeId', 'in', b), limit(200))))),
    );
    const mapa = new Map<string, Evento>();
    for (const e of locais) mapa.set(e.id, e);
    for (const s of snaps) for (const d of s.docs) mapa.set(d.id, { ...d.data(), id: d.id } as Evento);
    const lista = [...mapa.values()];
    const outros = lerLocais().filter((e) => !mapa.has(e.id));
    salvarLocais([...lista, ...outros]);
    return lista.sort((a, b) => a.data - b.data);
  } catch {
    return locais;
  }
}

export async function criarEvento(
  autor: EventoParticipante,
  clube: Clube,
  dados: { titulo: string; placeId?: string; placeName: string; placeEndereco?: string; data: number; observacao?: string },
): Promise<Evento> {
  const evento: Evento = {
    id: crypto.randomUUID(),
    clubeId: clube.id,
    clubeNome: clube.nome,
    titulo: dados.titulo.trim() || 'Ida em grupo',
    placeName: dados.placeName.trim(),
    data: dados.data,
    criadorUid: autor.uid,
    criadorNome: autor.name,
    confirmados: { [autor.uid]: autor },
    confirmadosUids: [autor.uid],
    createdAt: Date.now(),
  };
  if (dados.placeId) evento.placeId = dados.placeId;
  if (dados.placeEndereco) evento.placeEndereco = dados.placeEndereco;
  if (dados.observacao?.trim()) evento.observacao = dados.observacao.trim();

  substituirLocal(evento);
  sincronizar(() => {
    const { id, ...campos } = evento;
    return setDoc(doc(db, 'eventos', id), campos);
  });
  const quando = new Date(evento.data).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  notificarVarios(clube.membrosUids, {
    tipo: 'clube_evento',
    remetente: autor,
    placeId: evento.placeId,
    placeName: evento.placeName,
    texto: `marcou ${evento.titulo} em ${evento.placeName}, ${quando}.`,
    clubeId: clube.id,
    clubeNome: clube.nome,
  });
  return evento;
}

export function vaiNoEvento(evento: Evento, uid: string): boolean {
  return evento.confirmadosUids.includes(uid);
}

export async function alternarPresenca(evento: Evento, pessoa: EventoParticipante): Promise<Evento> {
  const vai = !vaiNoEvento(evento, pessoa.uid);
  const confirmados = { ...evento.confirmados };
  if (vai) confirmados[pessoa.uid] = pessoa;
  else delete confirmados[pessoa.uid];
  const atualizado: Evento = {
    ...evento,
    confirmados,
    confirmadosUids: vai
      ? [...new Set([...evento.confirmadosUids, pessoa.uid])]
      : evento.confirmadosUids.filter((u) => u !== pessoa.uid),
  };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'eventos', evento.id), {
      [`confirmados.${pessoa.uid}`]: vai ? pessoa : deleteField(),
      confirmadosUids: vai ? arrayUnion(pessoa.uid) : arrayRemove(pessoa.uid),
    }),
  );
  return atualizado;
}

export interface SugestaoLugar {
  placeId?: string;
  nome: string;
  endereco?: string;
}

/** Lugares já conhecidos pelo app (sem API paga): avaliados, em cache e de exemplo. */
export function sugerirLugares(texto: string, max = 8): SugestaoLugar[] {
  const termo = texto.trim().toLowerCase();
  const mapa = new Map<string, SugestaoLugar>();
  for (const r of getLocalReviews()) {
    if (!mapa.has(r.placeId)) mapa.set(r.placeId, { placeId: r.placeId, nome: r.placeName });
  }
  for (const p of [...MEMORY_PLACES_CACHE.values(), ...SAMPLE_PLACES]) {
    if (!mapa.has(p.id)) mapa.set(p.id, { placeId: p.id, nome: p.name, endereco: p.address });
  }
  const lista = [...mapa.values()];
  if (!termo) return lista.slice(0, max);
  return lista
    .filter((l) => l.nome.toLowerCase().includes(termo) || (l.endereco ?? '').toLowerCase().includes(termo))
    .slice(0, max);
}
