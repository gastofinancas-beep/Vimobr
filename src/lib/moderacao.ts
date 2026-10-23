import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { deixarDeSeguir } from './reviews';

// Denunciar e bloquear: exigência das lojas para apps com conteúdo publicado por usuários.
// Tudo vale na hora neste aparelho; o servidor recebe em segundo plano.

const LS_BLOQUEADOS = 'vimo_bloqueados_v1_';
const LS_OCULTOS = 'vimo_ocultos_v1_';

export interface PessoaBloqueada {
  uid: string;
  name: string;
  photo: string;
  em: number;
}

export type TipoDenuncia = 'post' | 'usuario' | 'avaliacao' | 'comentario';

export type MotivoDenuncia = 'spam' | 'ofensivo' | 'assedio' | 'sexual' | 'falso' | 'outro';

export const MOTIVOS_DENUNCIA: { valor: MotivoDenuncia; titulo: string }[] = [
  { valor: 'spam', titulo: 'Spam ou propaganda' },
  { valor: 'ofensivo', titulo: 'Discurso de ódio ou ofensivo' },
  { valor: 'assedio', titulo: 'Assédio ou ameaça' },
  { valor: 'sexual', titulo: 'Nudez ou conteúdo sexual' },
  { valor: 'falso', titulo: 'Informação falsa ou golpe' },
  { valor: 'outro', titulo: 'Outro motivo' },
];

const EVENTO = 'vimo:moderacao_atualizada';
const avisar = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO));
};

/** Re-renderiza listas quando alguém é bloqueado ou um conteúdo é ocultado. */
export function ouvirModeracao(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

function ler<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
}

function sincronizar(gravarRemoto: () => Promise<unknown>) {
  if (!isFirebaseConfigured) return;
  try {
    gravarRemoto().catch(() => {});
  } catch {}
}

// ---------- Bloqueio ----------

export function pessoasBloqueadas(meuUid: string): PessoaBloqueada[] {
  return Object.values(ler<Record<string, PessoaBloqueada>>(LS_BLOQUEADOS + meuUid, {})).sort((a, b) => b.em - a.em);
}

export function idsBloqueados(meuUid: string): Set<string> {
  return new Set(Object.keys(ler<Record<string, PessoaBloqueada>>(LS_BLOQUEADOS + meuUid, {})));
}

export function estaBloqueado(meuUid: string, uid: string): boolean {
  return idsBloqueados(meuUid).has(uid);
}

/** Bloquear esconde posts, idas e comentários da pessoa e desfaz o seguir. */
export function bloquear(meuUid: string, alvo: Omit<PessoaBloqueada, 'em'>): void {
  if (!alvo.uid || alvo.uid === meuUid) return;
  const mapa = ler<Record<string, PessoaBloqueada>>(LS_BLOQUEADOS + meuUid, {});
  const registro = { ...alvo, em: Date.now() };
  gravar(LS_BLOQUEADOS + meuUid, { ...mapa, [alvo.uid]: registro });
  avisar();
  void deixarDeSeguir(meuUid, alvo.uid).catch(() => {});
  if (meuUid) sincronizar(() => setDoc(doc(db, 'users', meuUid, 'bloqueados', alvo.uid), registro));
}

export function desbloquear(meuUid: string, uid: string): void {
  const mapa = ler<Record<string, PessoaBloqueada>>(LS_BLOQUEADOS + meuUid, {});
  delete mapa[uid];
  gravar(LS_BLOQUEADOS + meuUid, mapa);
  avisar();
  if (meuUid) sincronizar(() => deleteDoc(doc(db, 'users', meuUid, 'bloqueados', uid)));
}

/** Traz a lista do servidor (outro aparelho pode ter bloqueado alguém). */
export async function carregarBloqueados(meuUid: string): Promise<PessoaBloqueada[]> {
  if (isFirebaseConfigured && meuUid) {
    try {
      const snap = await getDocs(query(collection(db, 'users', meuUid, 'bloqueados'), limit(500)));
      const mapa = ler<Record<string, PessoaBloqueada>>(LS_BLOQUEADOS + meuUid, {});
      for (const d of snap.docs) mapa[d.id] = { ...(d.data() as PessoaBloqueada), uid: d.id };
      gravar(LS_BLOQUEADOS + meuUid, mapa);
    } catch {}
  }
  return pessoasBloqueadas(meuUid);
}

// ---------- Denúncia ----------

export function idsOcultos(meuUid: string): Set<string> {
  return new Set(ler<string[]>(LS_OCULTOS + meuUid, []));
}

/** Registra a denúncia para a equipe revisar e esconde o conteúdo para quem denunciou. */
export function denunciar(
  meuUid: string,
  dados: { tipo: TipoDenuncia; alvoId: string; alvoUid: string; motivo: MotivoDenuncia; detalhe?: string },
): void {
  if (dados.tipo !== 'usuario') {
    const ocultos = idsOcultos(meuUid);
    ocultos.add(dados.alvoId);
    gravar(LS_OCULTOS + meuUid, [...ocultos].slice(-500));
    avisar();
  }
  const registro = {
    ...dados,
    detalhe: dados.detalhe?.trim().slice(0, 500) || '',
    denuncianteUid: meuUid,
    status: 'aberta',
    createdAt: Date.now(),
  };
  if (meuUid) sincronizar(() => addDoc(collection(db, 'denuncias'), registro));
}

/** Filtro comum: tira de uma lista o que veio de quem eu bloqueei ou o que eu denunciei. */
export function semBloqueados<T extends { id: string; uid: string }>(lista: T[], meuUid: string): T[] {
  const bloqueados = idsBloqueados(meuUid);
  const ocultos = idsOcultos(meuUid);
  if (bloqueados.size === 0 && ocultos.size === 0) return lista;
  return lista.filter((x) => !bloqueados.has(x.uid) && !ocultos.has(x.id));
}
