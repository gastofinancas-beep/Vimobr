import { db, isFirebaseConfigured } from './firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
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

export function seguindoLocais(uid: string): string[] {
  try {
    const raw = localStorage.getItem(chaveLocal(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
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

export async function seguirUsuario(
  currentUid: string,
  targetUid: string,
  remetente?: { name: string; handle: string; photo: string }
): Promise<void> {
  const lista = seguindoLocais(currentUid);
  if (!lista.includes(targetUid)) {
    salvarLocal(currentUid, [...lista, targetUid]);
  }
  if (remetente) {
    criarNotificacao(targetUid, {
      tipo: 'seguir',
      remetente: { uid: currentUid, name: remetente.name, handle: remetente.handle, photo: remetente.photo },
      texto: 'começou a seguir o seu diário gastronômico.',
    });
  }
  if (!isFirebaseConfigured) return;
  const id = `${currentUid}_${targetUid}`;
  await setDoc(doc(db, 'follows', id), {
    followerUid: currentUid,
    targetUid,
    createdAt: serverTimestamp(),
  });
  await Promise.all([
    updateDoc(doc(db, 'users', currentUid), { followingCount: increment(1) }),
    updateDoc(doc(db, 'users', targetUid), { followersCount: increment(1) }),
  ]);
}

export async function deixarDeSeguir(
  currentUid: string,
  targetUid: string
): Promise<void> {
  salvarLocal(
    currentUid,
    seguindoLocais(currentUid).filter((id) => id !== targetUid)
  );
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'follows', `${currentUid}_${targetUid}`));
  await Promise.all([
    updateDoc(doc(db, 'users', currentUid), { followingCount: increment(-1) }),
    updateDoc(doc(db, 'users', targetUid), { followersCount: increment(-1) }),
  ]);
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
