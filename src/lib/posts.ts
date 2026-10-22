import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { seguindoLocais } from './follows';
import type { FoodTweet, TweetComment } from '../types';

const LS_POSTS_KEY = 'vimo_posts_v1';
const LS_POST_LIKES_KEY = 'vimo_post_likes_v1';
const LS_POST_COMMENTS_KEY = 'vimo_post_comments_v1';

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
  try {
    localStorage.setItem(LS_POSTS_KEY, JSON.stringify(posts));
  } catch {}
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

// ---------- Upload ----------

async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

async function uploadFotoParaStorage(uid: string, file: File): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const r = ref(storage, `posts/${uid}/${crypto.randomUUID()}.jpg`);
    await uploadBytes(r, file, { contentType: file.type });
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

export async function criarPost(
  autor: AutorPost,
  texto: string,
  fotos?: File | File[],
  placeId?: string,
  placeName?: string,
  cityName?: string,
  visibilidade: FoodTweet['visibilidade'] = 'publico',
): Promise<FoodTweet> {
  const arquivos = fotos
    ? Array.isArray(fotos) ? fotos : [fotos]
    : [];

  // Converte para DataURL localmente (rápido, sem rede)
  const dataUrls: string[] = await Promise.all(arquivos.map((f) => toDataUrl(f)));

  const postId = crypto.randomUUID();
  const post: FoodTweet = {
    id: postId,
    uid: autor.uid,
    authorName: autor.name,
    authorHandle: autor.handle,
    authorPhoto: autor.photo,
    text: texto,
    photoUrl: dataUrls[0],
    photoUrls: dataUrls.length > 0 ? dataUrls : undefined,
    placeId,
    placeName,
    cityName,
    visibilidade,
    createdAt: Date.now(),
    likesCount: 0,
    repostsCount: 0,
    commentsCount: 0,
  };

  // Salva localmente imediatamente (sem esperar rede)
  const local = getLocalPosts();
  local.unshift(post);
  saveLocalPosts(local);

  // Upload para Firebase em background — não bloqueia o retorno
  if (isFirebaseConfigured) {
    Promise.all(arquivos.map((f) => uploadFotoParaStorage(autor.uid, f)))
      .then(async (remoteUrls) => {
        const urls = remoteUrls.filter(Boolean) as string[];
        const postAtualizado = {
          ...post,
          photoUrl: urls[0] ?? post.photoUrl,
          photoUrls: urls.length > 0 ? urls : post.photoUrls,
        };
        try {
          const { id: _id, ...dados } = postAtualizado;
          const docRef = await addDoc(collection(db, 'posts'), dados);
          const comId = { ...postAtualizado, id: docRef.id };
          saveLocalPosts(getLocalPosts().map((p) => (p.id === postId ? comId : p)));
        } catch {}
      })
      .catch(() => {});
  }

  return post;
}

export async function carregarPosts(meuUid: string, limite = 30): Promise<FoodTweet[]> {
  let lista = getLocalPosts();

  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limite));
      const snap = await getDocs(q);
      if (!snap.empty) {
        lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodTweet));
      }
    } catch {}
  }

  const curtidos = getPostLikes(meuUid);
  const seguindo = new Set(seguindoLocais(meuUid));
  return lista.map((p) => ({
    ...p,
    userLiked: curtidos.has(p.id),
    isMutual: seguindo.has(p.uid),
  }));
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
      await updateDoc(doc(db, 'posts', postId), {
        likesCount: increment(curtiu ? 1 : -1),
      });
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

  // Salvar localmente
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
