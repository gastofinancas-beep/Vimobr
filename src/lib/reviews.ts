import {
  doc, collection, runTransaction, increment, setDoc, deleteDoc, getDoc, addDoc, writeBatch,
  query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';
import { CRITERIOS, type Comment, type FeedMode, type Place, type Ratings, type Review, type ReviewCompanion, type VereditoCritico, type OcasiaoIdeal, type VoltariaOpcao, type PratoAvaliado, type PrecoPercepcao } from '../types';
import { SAMPLE_PLACES } from './places';
import { criarNotificacao } from './notifications';

const toReview = (d: any): Review => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) });

export const calcOverall = (r: Ratings): number => {
  const vals = Object.values(r).filter((v) => typeof v === 'number' && v > 0) as number[];
  if (vals.length === 0) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 2) / 2;
};

async function comprimir(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.8));
  } catch {
    return file;
  }
}

export async function uploadFoto(uid: string, file: File): Promise<string> {
  if (!isFirebaseConfigured) {
    // Generate data URL for local storage demo
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
  try {
    const r = ref(storage, `reviews/${uid}/${crypto.randomUUID()}.jpg`);
    const envio = (async () => {
      await uploadBytes(r, await comprimir(file), { contentType: 'image/jpeg' });
      return await getDownloadURL(r);
    })();
    // Sem rede o Storage tenta por até 10 min; limita para não travar a publicação
    const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('upload timeout')), 15000));
    return await Promise.race([envio, limite]);
  } catch (err) {
    console.warn('Storage upload fallback:', err);
    return URL.createObjectURL(file);
  }
}

export interface Autor { uid: string; name: string; handle: string; photo: string }

// LocalStorage Persistence Keys
const LS_REVIEWS_KEY = 'vimo_reviews_v1';
const LS_FOLLOWING_KEY = 'vimo_following_v1';
const LS_LIKES_KEY = 'vimo_likes_v1';
const LS_COMMENTS_KEY = 'vimo_comments_v1';

// Initial Reviews (limpo para primeiro acesso)
export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_COMMENTS: Record<string, Comment[]> = {
  'rev-01': [
    {
      id: 'c-01',
      uid: 'user-pedro',
      authorName: 'Pedro Lima',
      authorHandle: '@pedrogastro',
      authorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      text: 'Esse tartare é espetacular! Pediu a sobremesa de castanha também?',
      createdAt: Date.now() - 3600000 * 3,
      likesCount: 4,
    },
    {
      id: 'c-02',
      uid: 'user-camila',
      authorName: 'Camila Duarte',
      authorHandle: '@camilagourmet',
      authorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      text: 'Sim! A mousse de chocolate 70% com crocante de cumaru fechou com chave de ouro.',
      createdAt: Date.now() - 3600000 * 2,
      parentId: 'c-01',
      likesCount: 2,
    },
  ],
  'rev-02': [
    {
      id: 'c-03',
      uid: 'user-bia',
      authorName: 'Beatriz Ramos',
      authorHandle: '@biaprados',
      authorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      text: 'Já coloquei na minha lista Quero Ir! A vitrine deles no fim de semana é um perigo de tão boa.',
      createdAt: Date.now() - 3600000 * 10,
      likesCount: 3,
    },
  ],
};

export function getLocalReviews(): Review[] {
  try {
    const raw = localStorage.getItem(LS_REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(LS_REVIEWS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: Review[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalReviews(reviews: Review[]) {
  try {
    localStorage.setItem(LS_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error('Error saving local reviews:', err);
  }
}

// ---------- Publicar avaliação
export async function salvarAvaliacao(a: {
  autor: Autor;
  place: Place;
  ratings: Ratings;
  notaGeral?: number;
  precoPercepcao?: PrecoPercepcao;
  text: string;
  visitedAt: number;
  fotos: File[];
  fotosPessoas?: File[];
  cardapio: File[];
  companions?: ReviewCompanion[];
  tituloReview?: string;
  veredito?: VereditoCritico;
  pratoDestaque?: string;
  pratoEvitar?: string;
  pontoFraco?: string;
  bebidaDestaque?: string;
  tempoEspera?: string;
  voltaria?: VoltariaOpcao;
  ocasiao?: OcasiaoIdeal;
  precoMedio?: string;
  notaCulinaria?: number;
  notaEntrada?: number;
  notaPratoPrincipal?: number;
  notaAmbiente?: number;
  notaAtendimento?: number;
  notaServico?: number;
  notaBebidas?: number;
  notaCustoBeneficio?: number;
  pratosAvaliados?: PratoAvaliado[];
}) {
  const [photos, peoplePhotos, menuPhotos] = await Promise.all([
    Promise.all(a.fotos.slice(0, 6).map((f) => uploadFoto(a.autor.uid, f))),
    Promise.all((a.fotosPessoas || []).slice(0, 6).map((f) => uploadFoto(a.autor.uid, f))),
    Promise.all(a.cardapio.slice(0, 3).map((f) => uploadFoto(a.autor.uid, f))),
  ]);

  const calculatedOverall = calcOverall(a.ratings);
  const newId = 'rev-' + crypto.randomUUID().slice(0, 8);
  const review: Review = {
    id: newId,
    uid: a.autor.uid,
    authorName: a.autor.name,
    authorHandle: a.autor.handle,
    authorPhoto: a.autor.photo,
    placeId: a.place.id,
    placeName: a.place.name,
    placePhotoName: a.place.photoName,
    placePhotoUrl: a.place.photoUrl || (photos.length > 0 ? photos[0] : undefined),
    cityKey: a.place.cityKey ?? 'sao-paulo-sp',
    cityName: a.place.cityName ?? 'São Paulo - SP',
    ratings: a.ratings,
    overall: calculatedOverall,
    tituloReview: a.tituloReview,
    text: a.text,
    photos,
    peoplePhotos,
    menuPhotos,
    visitedAt: a.visitedAt,
    createdAt: Date.now(),
    likesCount: 0,
    commentsCount: 0,
    companions: a.companions || [],
    veredito: a.veredito,
    pratoDestaque: a.pratoDestaque,
    pratoEvitar: a.pratoEvitar,
    pontoFraco: a.pontoFraco,
    bebidaDestaque: a.bebidaDestaque,
    tempoEspera: a.tempoEspera,
    voltaria: a.voltaria,
    precoPercepcao: a.precoPercepcao,
    ocasiao: a.ocasiao,
    precoMedio: a.precoMedio,
    notaCulinaria: a.notaCulinaria,
    notaEntrada: a.notaEntrada,
    notaPratoPrincipal: a.notaPratoPrincipal,
    notaAmbiente: a.notaAmbiente,
    notaAtendimento: a.notaAtendimento,
    notaServico: a.notaServico,
    notaBebidas: a.notaBebidas,
    notaCustoBeneficio: a.notaCustoBeneficio,
    pratosAvaliados: a.pratosAvaliados,
  };

  // Local storage save first
  const currentReviews = getLocalReviews();
  saveLocalReviews([review, ...currentReviews]);

  // Se houver amigos marcados na review, cria a notificação para cada um
  if (review.companions && review.companions.length > 0) {
    review.companions.forEach((comp) => {
      if (comp.status === 'pendente') {
        criarNotificacao(comp.uid, {
          tipo: 'marcacao_presenca',
          remetente: {
            uid: a.autor.uid,
            name: a.autor.name,
            handle: a.autor.handle,
            photo: a.autor.photo,
          },
          reviewId: newId,
          placeId: a.place.id,
          placeName: a.place.name,
          texto: `marcou você na avaliação de ${a.place.name}. Escolha como deseja aparecer!`,
          companionStatus: 'pendente',
        });
      }
    });
  }

  // Firestore em segundo plano: a ida já está salva no aparelho, então a confirmação
  // aparece na hora mesmo com rede lenta ou sem conexão.
  if (isFirebaseConfigured) {
    void (async () => {
    try {
      const reviewRef = doc(collection(db, 'reviews'));
      const placeRef = doc(db, 'places', a.place.id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(placeRef);
        const sums: Ratings = snap.exists() ? snap.data().sums
          : { ambiente: 0, comida: 0, atendimento: 0, custoBeneficio: 0 };
        const novas = { ...sums } as Ratings;
        CRITERIOS.forEach((c) => {
          novas[c.key] = (sums[c.key] || 0) + (a.ratings[c.key] || 0);
        });

        tx.set(placeRef, {
          name: a.place.name, address: a.place.address, lat: a.place.lat, lng: a.place.lng,
          photoName: a.place.photoName ?? null, cityKey: a.place.cityKey ?? '', cityName: a.place.cityName ?? '',
          reviewsCount: (snap.data()?.reviewsCount ?? 0) + 1, sums: novas,
        }, { merge: true });

        const firestoreReview: Omit<Review, 'id'> = {
          uid: a.autor.uid, authorName: a.autor.name, authorHandle: a.autor.handle, authorPhoto: a.autor.photo,
          placeId: a.place.id, placeName: a.place.name, placePhotoName: a.place.photoName,
          cityKey: a.place.cityKey ?? '', cityName: a.place.cityName ?? '',
          ratings: a.ratings, overall: a.notaGeral ?? calcOverall(a.ratings), text: a.text, photos, peoplePhotos, menuPhotos,
          visitedAt: a.visitedAt, createdAt: Date.now(), likesCount: 0, commentsCount: 0,
          ...(a.voltaria ? { voltaria: a.voltaria } : {}),
          ...(a.precoPercepcao ? { precoPercepcao: a.precoPercepcao } : {}),
          ...(a.pratoDestaque ? { pratoDestaque: a.pratoDestaque } : {}),
          ...(a.companions && a.companions.length > 0 ? { companions: a.companions } : {}),
        };
        tx.set(reviewRef, firestoreReview);
      });
    } catch (err) {
      console.warn('Firestore salvarAvaliacao error, used local fallback:', err);
    }
  })();
  }

  return newId;
}

// ---------- Seguir
export async function seguir(meu: string, alvo: string) {
  // Local storage
  try {
    const raw = localStorage.getItem(LS_FOLLOWING_KEY + '_' + meu);
    const set = new Set<string>(raw ? JSON.parse(raw) : ['user-camila', 'user-pedro']);
    set.add(alvo);
    localStorage.setItem(LS_FOLLOWING_KEY + '_' + meu, JSON.stringify([...set]));
  } catch {}

  if (isFirebaseConfigured) {
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'users', meu, 'following', alvo), { at: Date.now() });
      b.set(doc(db, 'users', alvo, 'followers', meu), { at: Date.now() });
      b.set(doc(db, 'users', meu), { followingCount: increment(1) }, { merge: true });
      b.set(doc(db, 'users', alvo), { followersCount: increment(1) }, { merge: true });
      await b.commit();
    } catch (err) {
      console.warn('Firestore seguir error:', err);
    }
  }
}

export async function deixarDeSeguir(meu: string, alvo: string) {
  try {
    const raw = localStorage.getItem(LS_FOLLOWING_KEY + '_' + meu);
    const list: string[] = raw ? JSON.parse(raw) : ['user-camila', 'user-pedro'];
    const filtered = list.filter((id) => id !== alvo);
    localStorage.setItem(LS_FOLLOWING_KEY + '_' + meu, JSON.stringify(filtered));
  } catch {}

  if (isFirebaseConfigured) {
    try {
      const b = writeBatch(db);
      b.delete(doc(db, 'users', meu, 'following', alvo));
      b.delete(doc(db, 'users', alvo, 'followers', meu));
      b.set(doc(db, 'users', meu), { followingCount: increment(-1) }, { merge: true });
      b.set(doc(db, 'users', alvo), { followersCount: increment(-1) }, { merge: true });
      await b.commit();
    } catch (err) {
      console.warn('Firestore deixarDeSeguir error:', err);
    }
  }
}

export async function idsSeguindo(meu: string): Promise<string[]> {
  try {
    const raw = localStorage.getItem(LS_FOLLOWING_KEY + '_' + meu);
    if (raw) return JSON.parse(raw);
    // Default demo following: user-camila and user-pedro
    const defaultFollowing = ['user-camila', 'user-pedro'];
    localStorage.setItem(LS_FOLLOWING_KEY + '_' + meu, JSON.stringify(defaultFollowing));
    return defaultFollowing;
  } catch {
    return ['user-camila', 'user-pedro'];
  }
}

// ---------- Aba EXPLORAR (3 modos)
export async function carregarExplorar(
  modo: FeedMode, meuUid: string, cityKey?: string
): Promise<Review[]> {
  let lista = getLocalReviews();

  if (isFirebaseConfigured) {
    try {
      if (modo === 'cidade' || modo === 'outra') {
        if (cityKey) {
          const q = query(collection(db, 'reviews'), where('cityKey', '==', cityKey), orderBy('createdAt', 'desc'), limit(30));
          const snap = await getDocs(q);
          if (!snap.empty) {
            lista = snap.docs.map(toReview);
          }
        }
      } else {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        if (!snap.empty) {
          lista = snap.docs.map(toReview);
        }
      }
    } catch (err) {
      console.warn('Firestore carregarExplorar fallback to local:', err);
    }
  }

  if (modo === 'cidade' || modo === 'outra') {
    if (!cityKey) return lista;
    const filtrada = lista.filter((r) => r.cityKey === cityKey);
    return filtrada.length > 0 ? filtrada : lista;
  }

  // Algoritmo: últimas 100 de qualquer cidade, ordenadas por pontuação
  const seguindo = new Set(await idsSeguindo(meuUid));
  const agora = Date.now();
  const pontos = (r: Review) => {
    const horas = (agora - r.createdAt) / 36e5;
    const base = r.likesCount + 2 * r.commentsCount + 3 * r.overall + (seguindo.has(r.uid) ? 8 : 0);
    return base / Math.pow(1 + horas / 24, 1.3);
  };
  return [...lista].sort((a, b) => pontos(b) - pontos(a)).slice(0, 30);
}

// Todas as idas de um usuário (para o Perfil e o Diário)
/** Avaliações do usuário já salvas neste aparelho (resposta imediata, sem rede). */
export function reviewsLocaisDoUsuario(uid: string): Review[] {
  return getLocalReviews()
    .filter((r) => r.uid === uid)
    .sort((a, b) => b.visitedAt - a.visitedAt);
}

export async function carregarReviewsDoUsuario(uid: string): Promise<Review[]> {
  const locais = getLocalReviews().filter((r) => r.uid === uid);
  let remotas: Review[] = [];

  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(
        query(collection(db, 'reviews'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(200))
      );
      remotas = snap.docs.map(toReview);
    } catch (err) {
      console.warn('Firestore carregarReviewsDoUsuario fallback:', err);
    }
  }

  const lista = remotas.length > 0 ? remotas : locais;
  return [...lista].sort((a, b) => b.visitedAt - a.visitedAt);
}

// Reviews de um lugar específico (para PlaceDetailScreen)
export async function carregarReviewsDoLugar(placeId: string): Promise<Review[]> {
  const locais = getLocalReviews().filter((r) => r.placeId === placeId);
  let remotas: Review[] = [];

  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(
        query(collection(db, 'reviews'), where('placeId', '==', placeId), orderBy('createdAt', 'desc'), limit(100))
      );
      remotas = snap.docs.map(toReview);
    } catch (err) {
      console.warn('Firestore carregarReviewsDoLugar fallback:', err);
    }
  }

  const lista = remotas.length > 0 ? remotas : locais;
  return [...lista].sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- Aba COMUNIDADE (só amigos)
export async function carregarComunidade(meuUid: string): Promise<Review[]> {
  const ids = await idsSeguindo(meuUid);
  if (!ids.length) return [];

  const local = getLocalReviews();
  const deAmigos = local.filter((r) => ids.includes(r.uid));

  if (isFirebaseConfigured) {
    try {
      const blocos: string[][] = [];
      for (let i = 0; i < ids.length; i += 30) blocos.push(ids.slice(i, i + 30));
      const resultados = await Promise.all(blocos.map((bloco) =>
        getDocs(query(collection(db, 'reviews'), where('uid', 'in', bloco), orderBy('createdAt', 'desc'), limit(30)))
      ));
      const fromFb = resultados.flatMap((s) => s.docs.map(toReview));
      if (fromFb.length > 0) return fromFb.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
    } catch (err) {
      console.warn('Firestore carregarComunidade fallback:', err);
    }
  }

  return deAmigos.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
}

// ---------- Curtidas e comentários
export async function alternarCurtida(reviewId: string, uid: string): Promise<boolean> {
  let isLiked = false;
  try {
    const likesRaw = localStorage.getItem(LS_LIKES_KEY + '_' + uid) || '[]';
    const likes: string[] = JSON.parse(likesRaw);
    if (likes.includes(reviewId)) {
      const updated = likes.filter((id) => id !== reviewId);
      localStorage.setItem(LS_LIKES_KEY + '_' + uid, JSON.stringify(updated));
      isLiked = false;
    } else {
      likes.push(reviewId);
      localStorage.setItem(LS_LIKES_KEY + '_' + uid, JSON.stringify(likes));
      isLiked = true;
    }

    const reviews = getLocalReviews();
    const target = reviews.find((r) => r.id === reviewId);
    if (target) {
      target.likesCount = Math.max(0, target.likesCount + (isLiked ? 1 : -1));
      saveLocalReviews(reviews);

      // Notifica o autor da review se outra pessoa curtiu
      if (isLiked && target.uid !== uid) {
        let userRaw: any = null;
        try {
          userRaw = JSON.parse(localStorage.getItem('vimo_current_user') || '{}');
        } catch {}
        criarNotificacao(target.uid, {
          tipo: 'curtida',
          remetente: {
            uid,
            name: userRaw?.displayName || 'Alguém',
            handle: userRaw?.handle || '@usuario',
            photo: userRaw?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          },
          reviewId,
          placeId: target.placeId,
          placeName: target.placeName,
          texto: `curtiu sua avaliação de ${target.placeName}.`,
        });
      }
    }
  } catch (err) {
    console.error('alternarCurtida local error:', err);
  }

  if (isFirebaseConfigured) {
    try {
      const likeRef = doc(db, 'reviews', reviewId, 'likes', uid);
      const revRef = doc(db, 'reviews', reviewId);
      await runTransaction(db, async (tx) => {
        const ja = await tx.get(likeRef);
        if (ja.exists()) {
          tx.delete(likeRef);
          tx.update(revRef, { likesCount: increment(-1) });
        } else {
          tx.set(likeRef, { at: Date.now() });
          tx.update(revRef, { likesCount: increment(1) });
        }
      });
    } catch (err) {
      console.warn('Firestore alternarCurtida error:', err);
    }
  }

  return isLiked;
}

export function verificarCurtida(reviewId: string, uid: string): boolean {
  try {
    const likesRaw = localStorage.getItem(LS_LIKES_KEY + '_' + uid) || '[]';
    const likes: string[] = JSON.parse(likesRaw);
    return likes.includes(reviewId);
  } catch {
    return false;
  }
}

export async function carregarComentarios(reviewId: string, max = 50): Promise<Comment[]> {
  let localComments: Comment[] = [];
  try {
    const raw = localStorage.getItem(LS_COMMENTS_KEY + '_' + reviewId);
    if (raw) {
      localComments = JSON.parse(raw);
    } else if (INITIAL_COMMENTS[reviewId]) {
      localComments = INITIAL_COMMENTS[reviewId];
      localStorage.setItem(LS_COMMENTS_KEY + '_' + reviewId, JSON.stringify(localComments));
    }
  } catch {}

  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'reviews', reviewId, 'comments'), orderBy('createdAt', 'asc'), limit(max));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, 'id'>) }));
      }
    } catch (err) {
      console.warn('Firestore carregarComentarios error:', err);
    }
  }

  return localComments;
}

export async function comentar(reviewId: string, autor: Autor, text: string, parentId?: string): Promise<string> {
  const cid = 'c-' + crypto.randomUUID().slice(0, 8);
  const novo: Comment = {
    id: cid,
    uid: autor.uid,
    authorName: autor.name,
    authorHandle: autor.handle,
    authorPhoto: autor.photo,
    text: text.trim(),
    createdAt: Date.now(),
    parentId,
    likesCount: 0,
  };

  try {
    const raw = localStorage.getItem(LS_COMMENTS_KEY + '_' + reviewId);
    const list: Comment[] = raw ? JSON.parse(raw) : (INITIAL_COMMENTS[reviewId] || []);
    list.push(novo);
    localStorage.setItem(LS_COMMENTS_KEY + '_' + reviewId, JSON.stringify(list));

    const reviews = getLocalReviews();
    const target = reviews.find((r) => r.id === reviewId);
    if (target) {
      target.commentsCount = (target.commentsCount || 0) + 1;
      saveLocalReviews(reviews);

      // Notifica o autor da review
      if (target.uid !== autor.uid) {
        criarNotificacao(target.uid, {
          tipo: 'comentario',
          remetente: {
            uid: autor.uid,
            name: autor.name,
            handle: autor.handle,
            photo: autor.photo,
          },
          reviewId,
          placeId: target.placeId,
          placeName: target.placeName,
          texto: `comentou: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        });
      }
    }
  } catch (err) {
    console.error('Error saving local comment:', err);
  }

  if (isFirebaseConfigured) {
    try {
      const b = writeBatch(db);
      const cRef = doc(collection(db, 'reviews', reviewId, 'comments'));
      b.set(cRef, {
        uid: autor.uid, authorName: autor.name, authorHandle: autor.handle, authorPhoto: autor.photo,
        text: text.trim(), createdAt: Date.now(), ...(parentId ? { parentId } : {}),
      });
      b.update(doc(db, 'reviews', reviewId), { commentsCount: increment(1) });
      await b.commit();
      return cRef.id;
    } catch (err) {
      console.warn('Firestore comentar error:', err);
    }
  }

  return cid;
}

// User lists management (Quero ir, Já fui, Favoritos)
export function obterListasUsuario(uid: string) {
  try {
    const raw = localStorage.getItem('vimo_lists_' + uid);
    if (raw) return JSON.parse(raw);
    // Só dados reais: listas começam vazias para todo mundo
    const padrao = { queroIr: [], jaFui: [], favoritos: [] };
    localStorage.setItem('vimo_lists_' + uid, JSON.stringify(padrao));
    return padrao;
  } catch {
    return { queroIr: [], jaFui: [], favoritos: [] };
  }
}

export function alternarListaUsuario(uid: string, listaKey: 'queroIr' | 'jaFui' | 'favoritos', placeId: string): boolean {
  try {
    const listas = obterListasUsuario(uid);
    const arr: string[] = listas[listaKey] || [];
    const index = arr.indexOf(placeId);
    let added = false;
    if (index >= 0) {
      arr.splice(index, 1);
    } else {
      arr.push(placeId);
      added = true;
    }
    listas[listaKey] = arr;
    localStorage.setItem('vimo_lists_' + uid, JSON.stringify(listas));
    return added;
  } catch {
    return false;
  }
}

export function obterScoreRestaurante(placeId: string, googleRatingFallback = 4.6, googleCountFallback = 180) {
  const reviews = getLocalReviews().filter((r) => r.placeId === placeId);
  const count = reviews.length;
  if (count < 5) {
    return {
      googleRating: googleRatingFallback,
      googleUserRatingCount: googleCountFallback,
      vimoRating: null,
      vimoReviewsCount: 0,
      vimoDesbloqueado: false,
      faltamParaDesbloquear: 5,
    };
  }
  const sum = reviews.reduce((acc, r) => acc + (r.overall || 4.5), 0);
  const vimoRating = Math.round((sum / count) * 2) / 2;
  return {
    googleRating: googleRatingFallback,
    googleUserRatingCount: googleCountFallback,
    vimoRating,
    vimoReviewsCount: count,
    vimoDesbloqueado: true,
    faltamParaDesbloquear: 0,
  };
}
