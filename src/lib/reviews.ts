import {
  doc, collection, runTransaction, increment, setDoc, deleteDoc, getDoc, addDoc, writeBatch,
  query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured } from './firebase';
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
    // Endereço blob: só vale nesta aba; gravado na avaliação, a foto quebrava para todo mundo
    console.warn('Envio da foto falhou:', err);
    return '';
  }
}

const fotoRemota = (u?: string) => !!u && /^https?:\/\//.test(u);

/**
 * Grava a avaliação no Firestore e soma as notas no lugar. Pode ser chamada de novo
 * para a mesma avaliação: se ela já estiver no servidor, não faz nada.
 */
async function subirAvaliacao(review: Review, place?: Place): Promise<void> {
  const reviewRef = doc(db, 'reviews', review.id);
  const placeRef = doc(db, 'places', review.placeId);

  await runTransaction(db, async (tx) => {
    const jaExiste = await tx.get(reviewRef);
    if (jaExiste.exists()) return;

    const snap = await tx.get(placeRef);
    // Lugares do catálogo e os cadastrados por usuário nascem sem `sums`
    const sums: Partial<Ratings> = (snap.exists() ? snap.data()?.sums : null) ?? {};
    const novas: Record<string, number> = { ...sums };
    Object.entries(review.ratings || {}).forEach(([chave, valor]) => {
      if (typeof valor === 'number' && valor > 0) novas[chave] = (novas[chave] || 0) + valor;
    });

    // Lugar que já existe só recebe os contadores; os dados dele não são sobrescritos
    const dadosDoLugar = !snap.exists() && place
      ? {
          name: place.name, address: place.address, lat: place.lat, lng: place.lng,
          photoName: place.photoName ?? null, cityKey: place.cityKey ?? '', cityName: place.cityName ?? '',
        }
      : {};
    tx.set(placeRef, { ...dadosDoLugar, reviewsCount: (snap.data()?.reviewsCount ?? 0) + 1, sums: novas }, { merge: true });

    const { id: _id, ...campos } = review;
    const remoto = {
      ...campos,
      photos: (review.photos || []).filter(fotoRemota),
      peoplePhotos: (review.peoplePhotos || []).filter(fotoRemota),
      menuPhotos: (review.menuPhotos || []).filter(fotoRemota),
      placePhotoUrl: fotoRemota(review.placePhotoUrl) ? review.placePhotoUrl : undefined,
      likesCount: 0,
      commentsCount: 0,
    };
    // Firestore recusa campos undefined (ex.: lugar sem foto)
    tx.set(reviewRef, JSON.parse(JSON.stringify(remoto)));
  });
}

const reenviando = new Set<string>();
const LS_JA_SUBIRAM_KEY = 'vimo_reviews_no_servidor_v1';

function lerJaSubiram(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_JA_SUBIRAM_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function marcarJaSubiram(ids: string[]) {
  if (ids.length === 0) return;
  try {
    const todas = lerJaSubiram();
    ids.forEach((id) => todas.add(id));
    localStorage.setItem(LS_JA_SUBIRAM_KEY, JSON.stringify([...todas].slice(-2000)));
  } catch {}
}

/** Idas minhas que ficaram só no aparelho (rede caiu, erro antigo) sobem na próxima leitura. */
function reenviarPendentes(uid: string, locais: Review[], remotas: Review[]): void {
  if (!isFirebaseConfigured || auth.currentUser?.uid !== uid) return;
  const noServidor = new Set(remotas.map((r) => r.id));
  // Quem já esteve no servidor e sumiu foi apagada em outro aparelho: não volta
  const jaSubiram = lerJaSubiram();
  marcarJaSubiram(locais.filter((r) => noServidor.has(r.id) && !jaSubiram.has(r.id)).map((r) => r.id));
  const pendentes = locais.filter(
    (r) => r.uid === uid && r.placeId && !noServidor.has(r.id) && !jaSubiram.has(r.id) && !reenviando.has(r.id),
  );
  for (const r of pendentes.slice(0, 20)) {
    reenviando.add(r.id);
    subirAvaliacao(r).then(() => marcarJaSubiram([r.id])).catch((err) => {
      reenviando.delete(r.id);
      console.warn('Reenvio da avaliação falhou:', err);
    });
  }
}

/** Junta o que está no aparelho com o que veio do servidor; a versão do servidor vale mais. */
function juntarReviews(locais: Review[], remotas: Review[]): Review[] {
  const mapa = new Map<string, Review>();
  for (const r of locais) mapa.set(r.id, r);
  for (const r of remotas) mapa.set(r.id, r);
  return [...mapa.values()];
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

export async function excluirAvaliacao(reviewId: string): Promise<void> {
  const atualizadas = getLocalReviews().filter((r) => r.id !== reviewId);
  saveLocalReviews(atualizadas);
  if (!isFirebaseConfigured) return;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (err) {
    console.warn('Erro ao excluir avaliação no Firestore:', err);
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
  modalidade?: 'presencial' | 'delivery';
}) {
  const enviar = async (arquivos: File[]) =>
    (await Promise.all(arquivos.map((f) => uploadFoto(a.autor.uid, f)))).filter(Boolean);
  const [photos, peoplePhotos, menuPhotos] = await Promise.all([
    enviar(a.fotos.slice(0, 6)),
    enviar((a.fotosPessoas || []).slice(0, 6)),
    enviar(a.cardapio.slice(0, 3)),
  ]);

  const calculatedOverall = calcOverall(a.ratings);
  const newId = 'rev-' + crypto.randomUUID();
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
    modalidade: a.modalidade,
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
          texto: `marcou você em ${a.place.name}.`,
          companionStatus: 'pendente',
        });
      }
    });
  }

  // Firestore em segundo plano: a ida já está salva no aparelho, então a confirmação
  // aparece na hora mesmo com rede lenta ou sem conexão.
  if (isFirebaseConfigured) {
    // mesmo id do aparelho: evita contar a ida duas vezes e permite apagar depois
    subirAvaliacao(review, a.place).then(() => marcarJaSubiram([newId])).catch((err) => {
      console.warn('Avaliação ficou só no aparelho; será reenviada depois:', err);
    });
  }

  return newId;
}

// ---------- Seguir
export async function seguir(meu: string, alvo: string) {
  // Local storage
  try {
    const raw = localStorage.getItem(LS_FOLLOWING_KEY + '_' + meu);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
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
    const list: string[] = raw ? JSON.parse(raw) : [];
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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
      // só reenvia quando a lista do servidor veio inteira
      if (snap.size < 200) reenviarPendentes(uid, locais, remotas);
    } catch (err) {
      console.warn('Firestore carregarReviewsDoUsuario fallback:', err);
    }
  }

  return juntarReviews(locais, remotas).sort((a, b) => b.visitedAt - a.visitedAt);
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

  return juntarReviews(locais, remotas).sort((a, b) => b.createdAt - a.createdAt);
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

export function obterScoreRestaurante(
  placeId: string,
  googleRatingFallback?: number,
  googleCountFallback?: number,
  avaliacoes?: Review[],
) {
  // Com a lista da tela entram as avaliações de todo mundo, não só as deste aparelho
  const reviews = (avaliacoes ?? getLocalReviews()).filter((r) => r.placeId === placeId && (r.overall ?? 0) > 0);
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
  const sum = reviews.reduce((acc, r) => acc + r.overall, 0);
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

export interface LugarDestaque {
  placeId: string;
  placeName: string;
  mediaNotas: number;
  totalAvaliacoes: number;
}

export async function carregarMelhoresAvaliados(limite = 5): Promise<LugarDestaque[]> {
  const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let lista = getLocalReviews().filter((r) => r.createdAt >= seteDiasAtras && (r.overall ?? 0) > 0);

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('createdAt', '>=', seteDiasAtras),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        lista = snap.docs.map(toReview).filter((r) => (r.overall ?? 0) > 0);
      }
    } catch {
      // fallback to local
    }
  }

  const byPlace: Record<string, { placeName: string; sum: number; count: number }> = {};
  for (const r of lista) {
    if (!r.placeId) continue;
    if (!byPlace[r.placeId]) byPlace[r.placeId] = { placeName: r.placeName ?? '', sum: 0, count: 0 };
    byPlace[r.placeId].sum += r.overall ?? 0;
    byPlace[r.placeId].count++;
  }

  return Object.entries(byPlace)
    .map(([placeId, { placeName, sum, count }]) => ({
      placeId,
      placeName,
      mediaNotas: Math.round((sum / count) * 2) / 2,
      totalAvaliacoes: count,
    }))
    .sort((a, b) => b.mediaNotas - a.mediaNotas || b.totalAvaliacoes - a.totalAvaliacoes)
    .slice(0, limite);
}

// ---------- Avaliação ligada a um post (botão "Veja a avaliação" no feed)
const cacheAvaliacaoDoPost = new Map<string, Promise<Review | null>>();

/** Avaliação mais recente que o autor fez do lugar marcado no post. Local primeiro, depois Firestore. */
export function buscarAvaliacaoDoPost(uid: string, placeId: string): Promise<Review | null> {
  const chave = `${uid}|${placeId}`;
  const local = getLocalReviews()
    .filter((r) => r.uid === uid && r.placeId === placeId)
    .sort((a, b) => b.visitedAt - a.visitedAt)[0];
  if (local) return Promise.resolve(local);
  const emCache = cacheAvaliacaoDoPost.get(chave);
  if (emCache) return emCache;
  if (!isFirebaseConfigured || !uid) return Promise.resolve(null);

  const busca = Promise.race([
    getDocs(query(collection(db, 'reviews'), where('uid', '==', uid), where('placeId', '==', placeId), limit(10))).then(
      (snap) => snap.docs.map(toReview).sort((a, b) => b.visitedAt - a.visitedAt)[0] ?? null
    ),
    new Promise<null>((resolver) => setTimeout(() => resolver(null), 6000)),
  ]).catch(() => null);
  cacheAvaliacaoDoPost.set(chave, busca);
  return busca;
}
