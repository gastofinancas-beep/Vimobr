import { db, isFirebaseConfigured } from './firebase';
import {
  doc,
  getDoc,
  increment,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { criarNotificacao } from './notifications';
import type { UserProfile } from '../types';

const chaveLocal = (uid: string) => `vimo_seguindo_${uid}`;
// O app teve dois sistemas de seguir; a lista antiga é juntada a esta na primeira leitura
const chaveAntiga = (uid: string) => `vimo_following_v1_${uid}`;

export function seguindoLocais(uid: string): string[] {
  try {
    const atual: string[] = JSON.parse(localStorage.getItem(chaveLocal(uid)) || '[]');
    const antigaRaw = localStorage.getItem(chaveAntiga(uid));
    if (!antigaRaw) return atual;
    const junta = [...new Set([...atual, ...(JSON.parse(antigaRaw) as string[])])];
    localStorage.setItem(chaveLocal(uid), JSON.stringify(junta));
    localStorage.removeItem(chaveAntiga(uid));
    return junta;
  } catch {
    return [];
  }
}

function salvarLocal(uid: string, lista: string[]) {
  try {
    localStorage.setItem(chaveLocal(uid), JSON.stringify(lista));
  } catch {}
}

export function estaSeguindo(currentUid: string, targetUid: string): boolean {
  return seguindoLocais(currentUid).includes(targetUid);
}

/**
 * Seguir grava, de uma vez só: users/{eu}/following/{alvo}, users/{alvo}/followers/{eu}
 * e os dois contadores. A regra do Firestore só aceita o contador do outro junto com a vaga.
 */
export async function seguirUsuario(
  currentUid: string,
  targetUid: string,
  remetente?: { name: string; handle: string; photo: string }
): Promise<void> {
  if (!currentUid || !targetUid || currentUid === targetUid) return;
  const lista = seguindoLocais(currentUid);
  if (lista.includes(targetUid)) return;
  salvarLocal(currentUid, [...lista, targetUid]);
  if (remetente) {
    criarNotificacao(targetUid, {
      tipo: 'seguir',
      remetente: { uid: currentUid, name: remetente.name, handle: remetente.handle, photo: remetente.photo },
      texto: 'começou a seguir o seu diário gastronômico.',
    });
  }
  if (!isFirebaseConfigured) return;
  try {
    const lote = writeBatch(db);
    lote.set(doc(db, 'users', currentUid, 'following', targetUid), { at: Date.now() });
    lote.set(doc(db, 'users', targetUid, 'followers', currentUid), { at: Date.now() });
    lote.update(doc(db, 'users', currentUid), { followingCount: increment(1) });
    lote.update(doc(db, 'users', targetUid), { followersCount: increment(1) });
    await lote.commit();
  } catch (err) {
    // já seguia pelo servidor, sem rede ou regra ainda não publicada: vale o aparelho
    console.warn('Seguir ficou só no aparelho:', err);
  }
}

export async function deixarDeSeguir(
  currentUid: string,
  targetUid: string
): Promise<void> {
  if (!currentUid || !targetUid) return;
  salvarLocal(
    currentUid,
    seguindoLocais(currentUid).filter((id) => id !== targetUid)
  );
  if (!isFirebaseConfigured) return;
  try {
    const lote = writeBatch(db);
    lote.delete(doc(db, 'users', currentUid, 'following', targetUid));
    lote.delete(doc(db, 'users', targetUid, 'followers', currentUid));
    lote.update(doc(db, 'users', currentUid), { followingCount: increment(-1) });
    lote.update(doc(db, 'users', targetUid), { followersCount: increment(-1) });
    await lote.commit();
  } catch (err) {
    console.warn('Deixar de seguir ficou só no aparelho:', err);
  }
}

/** Traz do servidor quem eu sigo (outro aparelho, reinstalação) e junta com a lista local. */
export async function sincronizarSeguindo(uid: string): Promise<string[]> {
  if (!isFirebaseConfigured || !uid) return seguindoLocais(uid);
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'following'), limit(1000)));
    const junta = [...new Set([...seguindoLocais(uid), ...snap.docs.map((d) => d.id)])];
    salvarLocal(uid, junta);
    return junta;
  } catch {
    return seguindoLocais(uid);
  }
}

export async function carregarPerfil(uid: string): Promise<Partial<UserProfile>> {
  if (!isFirebaseConfigured) return {};
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as Partial<UserProfile>) : {};
  } catch {
    return {};
  }
}

export async function buscarUsuarios(termo: string): Promise<Partial<UserProfile & { uid: string }>[]> {
  if (!isFirebaseConfigured || termo.trim().length < 2) return [];
  const q = termo.trim().toLowerCase();
  try {
    const col = collection(db, 'users');
    const [porNome, porHandle] = await Promise.all([
      getDocs(query(col, where('displayNameLower', '>=', q), where('displayNameLower', '<=', q + ''), orderBy('displayNameLower'), limit(10))),
      getDocs(query(col, where('handle', '>=', '@' + q), where('handle', '<=', '@' + q + ''), orderBy('handle'), limit(10))),
    ]);
    const mapa = new Map<string, Partial<UserProfile & { uid: string }>>();
    [...porNome.docs, ...porHandle.docs].forEach((d) => {
      if (!mapa.has(d.id)) mapa.set(d.id, { uid: d.id, ...(d.data() as Partial<UserProfile>) });
    });
    return [...mapa.values()].slice(0, 15);
  } catch {
    return [];
  }
}
