import { db, isFirebaseConfigured } from './firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
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
  targetUid: string
): Promise<void> {
  const lista = seguindoLocais(currentUid);
  if (!lista.includes(targetUid)) {
    salvarLocal(currentUid, [...lista, targetUid]);
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
