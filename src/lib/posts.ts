import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { seguindoLocais } from './follows';
import { meusClubesLocais } from './clubes';
import { semBloqueados } from './moderacao';
import type { FoodTweet, TweetComment } from '../types';

const LS_POSTS_KEY = 'vimo_posts_v1';
const LS_POST_LIKES_KEY = 'vimo_post_likes_v1';
const LS_POST_COMMENTS_KEY = 'vimo_post_comments_v1';
// Apagados e arquivados neste aparelho valem antes da sincronização terminar
const LS_POST_AJUSTES_KEY = 'vimo_post_ajustes_v1';
type AjustePost = 'apagado' | 'privado' | 'publico';

export type Visibilidade = NonNullable<FoodTweet['visibilidade']>;

// ---------- localStorage helpers ----------

function getLocalPosts(): FoodTweet[] {
  try {
    const raw = localStorage.getItem(LS_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPosts(posts: FoodTweet[]) {
  // Fotos em DataURL pesam: se o armazenamento do aparelho encher, descarta os posts mais antigos
  let lista = posts;
  while (lista.length > 0) {
    try {
      localStorage.setItem(LS_POSTS_KEY, JSON.stringify(lista));
      return;
    } catch {
      if (lista.length === 1) return;
      lista = lista.slice(0, -1);
    }
  }
}

function getPostLikes(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(LS_POST_LIKES_KEY);
    const mapa: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    return new Set(mapa[uid] ?? []);
  } catch {
    return new Set();
  }
}

function setPostLike(uid: string, postId: string, curtiu: boolean) {
  try {
    const raw = localStorage.getItem(LS_POST_LIKES_KEY);
    const mapa: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!mapa[uid]) mapa[uid] = [];
    if (curtiu) {
      if (!mapa[uid].includes(postId)) mapa[uid].push(postId);
    } else {
      mapa[uid] = mapa[uid].filter((id) => id !== postId);
    }
    localStorage.setItem(LS_POST_LIKES_KEY, JSON.stringify(mapa));
  } catch {}
}

function getLocalPostComments(postId: string): TweetComment[] {
  try {
    const raw = localStorage.getItem(LS_POST_COMMENTS_KEY);
    const mapa: Record<string, TweetComment[]> = raw ? JSON.parse(raw) : {};
    return mapa[postId] ?? [];
  } catch {
    return [];
  }
}

/** Firestore recusa campos com valor undefined. */
function semUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function lerAjustes(): Record<string, AjustePost> {
  try {
    return JSON.parse(localStorage.getItem(LS_POST_AJUSTES_KEY) || '{}');
  } catch {
    return {};
  }
}

function gravarAjuste(id: string, ajuste: AjustePost) {
  try {
    localStorage.setItem(LS_POST_AJUSTES_KEY, JSON.stringify({ ...lerAjustes(), [id]: ajuste }));
  } catch {}
}

function mesclar(locais: FoodTweet[], remotos: FoodTweet[]): FoodTweet[] {
  const ajustes = lerAjustes();
  const mapa = new Map<string, FoodTweet>();
  for (const p of locais) mapa.set(p.id, p);
  for (const p of remotos) mapa.set(p.id, p);
  return [...mapa.values()]
    .filter((p) => ajustes[p.id] !== 'apagado')
    .map((p) => {
      const a = ajustes[p.id];
      return a === 'privado' || a === 'publico'
        ? { ...p, visibilidade: a, clubeId: undefined, clubeNome: undefined }
        : p;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function comEstadoDoUsuario(lista: FoodTweet[], meuUid: string): FoodTweet[] {
  const curtidos = getPostLikes(meuUid);
  const seguindo = new Set(seguindoLocais(meuUid));
  return semBloqueados(lista, meuUid).map((p) => ({
    ...p,
    userLiked: curtidos.has(p.id),
    isMutual: seguindo.has(p.uid),
  }));
}

// ---------- Imagens ----------

function lerArquivo(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

/** Reduz a foto para no máximo 1280px em JPEG — cabe no aparelho e sobe mais rápido. */
async function comprimirImagem(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  const original = await lerArquivo(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Imagem inválida'));
      el.src = original;
    });
    const MAX = 1280;
    const escala = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    return { dataUrl, blob: blob ?? file };
  } catch {
    return { dataUrl: original, blob: file };
  }
}

async function uploadFotoParaStorage(uid: string, blob: Blob): Promise<string | null> {
  try {
    const r = ref(storage, `posts/${uid}/${crypto.randomUUID()}.jpg`);
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(r);
  } catch {
    return null;
  }
}

// ---------- Público ----------

export interface AutorPost {
  uid: string;
  name: string;
  handle: string;
  photo: string;
}

export interface NovoPost {
  texto: string;
  fotos?: File[];
  visibilidade?: Visibilidade;
  clube?: { id: string; nome: string };
  placeId?: string;
  placeName?: string;
  cityName?: string;
}

export async function criarPost(autor: AutorPost, dados: NovoPost): Promise<FoodTweet> {
  const arquivos = dados.fotos ?? [];
  const imagens = await Promise.all(arquivos.map(comprimirImagem));
  const dataUrls = imagens.map((i) => i.dataUrl);
  const visibilidade: Visibilidade = dados.clube ? 'clube' : dados.visibilidade ?? 'publico';

  const post: FoodTweet = {
    id: crypto.randomUUID(),
    uid: autor.uid,
    authorName: autor.name,
    authorHandle: autor.handle,
    authorPhoto: autor.photo,
    text: dados.texto,
    photoUrl: dataUrls[0],
    photoUrls: dataUrls.length > 0 ? dataUrls : undefined,
    placeId: dados.placeId,
    placeName: dados.placeName,
    cityName: dados.cityName,
    visibilidade,
    clubeId: visibilidade === 'clube' ? dados.clube?.id : undefined,
    clubeNome: visibilidade === 'clube' ? dados.clube?.nome : undefined,
    createdAt: Date.now(),
    likesCount: 0,
    repostsCount: 0,
    commentsCount: 0,
  };

  // Salva no aparelho na hora; a tela não espera a rede
  saveLocalPosts([post, ...getLocalPosts()]);

  if (isFirebaseConfigured) {
    void (async () => {
      if (!autor.uid) return;
      const remotas = await Promise.all(imagens.map((i) => uploadFotoParaStorage(autor.uid, i.blob)));
      const urls = remotas.every(Boolean) ? (remotas as string[]) : [];
      // Sem URL remota não sobe o post com DataURL (estoura o limite do documento)
      if (arquivos.length > 0 && urls.length === 0) return;
      const remoto: FoodTweet = {
        ...post,
        photoUrl: urls[0],
        photoUrls: urls.length > 0 ? urls : undefined,
      };
      const { id, userLiked: _l, isMutual: _m, ...campos } = remoto;
      try {
        const destino =
          visibilidade === 'privado'
            ? doc(db, 'users', autor.uid, 'postsPrivados', id)
            : doc(db, 'posts', id);
        await setDoc(destino, semUndefined(campos));
        saveLocalPosts(getLocalPosts().map((p) => (p.id === id ? remoto : p)));
      } catch {}
    })();
  }

  return post;
}

/** Regra de quem vê o quê no feed geral: post de clube só para os membros; "só eu" fica fora. */
function visivelNoFeed(p: FoodTweet, meuUid: string, seguindo: Set<string>, meusClubes: Set<string>): boolean {
  const v = p.visibilidade ?? 'publico';
  if (v === 'publico') return true;
  if (v === 'amigos') return p.uid === meuUid || seguindo.has(p.uid);
  if (v === 'clube') return !!p.clubeId && meusClubes.has(p.clubeId);
  return false;
}

export async function carregarPosts(meuUid: string, limite = 30): Promise<FoodTweet[]> {
  let remotos: FoodTweet[] = [];
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limite)));
      remotos = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FoodTweet));
    } catch {}
  }
  const seguindo = new Set(seguindoLocais(meuUid));
  const meusClubes = new Set(meusClubesLocais(meuUid).map((c) => c.id));
  const lista = mesclar(getLocalPosts(), remotos).filter((p) => visivelNoFeed(p, meuUid, seguindo, meusClubes));
  return comEstadoDoUsuario(lista, meuUid);
}

/** Posts de uma pessoa, já filtrados pelo que quem está vendo pode ver. */
export async function carregarPostsDoUsuario(
  uid: string,
  meuUid: string,
  meusClubesIds: string[] = [],
): Promise<FoodTweet[]> {
  const ehDono = uid === meuUid;
  let remotos: FoodTweet[] = [];
  if (isFirebaseConfigured) {
    try {
      const consultas = [getDocs(query(collection(db, 'posts'), where('uid', '==', uid), limit(60)))];
      if (ehDono) consultas.push(getDocs(query(collection(db, 'users', uid, 'postsPrivados'), limit(60))));
      const snaps = await Promise.all(consultas);
      remotos = snaps.flatMap((s) => s.docs.map((d) => ({ ...d.data(), id: d.id } as FoodTweet)));
    } catch {}
  }
  const seguindo = new Set(seguindoLocais(meuUid));
  const clubes = new Set(meusClubesIds);
  const lista = mesclar(getLocalPosts().filter((p) => p.uid === uid), remotos).filter((p) => {
    if (ehDono) return true;
    const v = p.visibilidade ?? 'publico';
    if (v === 'publico') return true;
    if (v === 'amigos') return seguindo.has(uid);
    if (v === 'clube') return !!p.clubeId && clubes.has(p.clubeId);
    return false;
  });
  return comEstadoDoUsuario(lista, meuUid);
}

export async function curtirPost(postId: string, uid: string): Promise<boolean> {
  const curtidos = getPostLikes(uid);
  const curtiu = !curtidos.has(postId);

  setPostLike(uid, postId, curtiu);
  saveLocalPosts(
    getLocalPosts().map((p) =>
      p.id === postId ? { ...p, likesCount: Math.max(0, p.likesCount + (curtiu ? 1 : -1)) } : p
    )
  );

  if (isFirebaseConfigured) {
    try {
      updateDoc(doc(db, 'posts', postId), { likesCount: increment(curtiu ? 1 : -1) }).catch(() => {});
    } catch {}
  }

  return curtiu;
}

export async function carregarComentariosPost(postId: string): Promise<TweetComment[]> {
  const local = getLocalPostComments(postId);

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc'),
        limit(100)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(
          (d) => ({ id: d.id, tweetId: postId, ...d.data() } as TweetComment)
        );
      }
    } catch {}
  }

  return local;
}

export async function comentarPost(
  postId: string,
  autor: AutorPost,
  texto: string
): Promise<TweetComment> {
  const comentario: TweetComment = {
    id: crypto.randomUUID(),
    tweetId: postId,
    uid: autor.uid,
    authorName: autor.name,
    authorHandle: autor.handle,
    authorPhoto: autor.photo,
    text: texto,
    createdAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(LS_POST_COMMENTS_KEY);
    const mapa: Record<string, TweetComment[]> = raw ? JSON.parse(raw) : {};
    if (!mapa[postId]) mapa[postId] = [];
    mapa[postId].push(comentario);
    localStorage.setItem(LS_POST_COMMENTS_KEY, JSON.stringify(mapa));
  } catch {}

  saveLocalPosts(
    getLocalPosts().map((p) =>
      p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
    )
  );

  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        uid: autor.uid,
        authorName: autor.name,
        authorHandle: autor.handle,
        authorPhoto: autor.photo,
        text: texto,
        createdAt: Date.now(),
      });
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    } catch {}
  }

  return comentario;
}

// ---------- Apagar e arquivar (só o autor) ----------

/** Fotos ainda em DataURL não sobem para o Firestore (limite de tamanho do documento). */
const temFotoLocal = (p: FoodTweet) => (p.photoUrls ?? []).some((u) => u.startsWith('data:'));

function camposRemotos(p: FoodTweet) {
  const { id: _id, userLiked: _l, isMutual: _m, ...campos } = p;
  return semUndefined(campos);
}

export function apagarPost(post: FoodTweet): void {
  gravarAjuste(post.id, 'apagado');
  saveLocalPosts(getLocalPosts().filter((p) => p.id !== post.id));
  if (!isFirebaseConfigured || !post.uid) return;
  void Promise.allSettled([
    deleteDoc(doc(db, 'posts', post.id)),
    deleteDoc(doc(db, 'users', post.uid, 'postsPrivados', post.id)),
  ]);
}

/** Arquivar = deixar só para o autor. Desarquivar volta como público. */
export function alterarArquivamento(post: FoodTweet, arquivar: boolean): FoodTweet {
  const visibilidade: Visibilidade = arquivar ? 'privado' : 'publico';
  const novo: FoodTweet = { ...post, visibilidade, clubeId: undefined, clubeNome: undefined };
  gravarAjuste(post.id, visibilidade);
  const locais = getLocalPosts();
  if (locais.some((p) => p.id === post.id)) saveLocalPosts(locais.map((p) => (p.id === post.id ? { ...p, ...novo } : p)));

  if (isFirebaseConfigured && post.uid && !temFotoLocal(novo)) {
    const publico = doc(db, 'posts', post.id);
    const privado = doc(db, 'users', post.uid, 'postsPrivados', post.id);
    const [destino, origem] = arquivar ? [privado, publico] : [publico, privado];
    void (async () => {
      try {
        await setDoc(destino, camposRemotos(novo));
        await deleteDoc(origem).catch(() => {});
      } catch {}
    })();
  }
  return novo;
}
