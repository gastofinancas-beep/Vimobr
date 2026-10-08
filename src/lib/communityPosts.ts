import { SAMPLE_PLACES } from './places';

const LS_COMMUNITY_POSTS_KEY = 'vimo_community_posts_v2';
const LS_POST_LIKES_KEY = 'vimo_post_likes_v2';
const LS_POST_COMMENTS_KEY = 'vimo_post_comments_v2';

export interface CommunityComment {
  id: string;
  postId: string;
  uid: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

export interface CommunityPost {
  id: string;
  author: {
    uid: string;
    name: string;
    handle: string;
    photo: string;
  };
  text: string;
  placeTag?: {
    id: string;
    name: string;
    address?: string;
  };
  photoUrl?: string;
  likesCount: number;
  userLiked?: boolean;
  commentsCount: number;
  createdAt: number;
}

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-01',
    author: {
      uid: 'user-camila',
      name: 'Camila Duarte',
      handle: '@camilagourmet',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    text: 'Galera, qual a melhor pedida de brunch este fim de semana em Pinheiros? Quero aquele croissant quentinho e café coado impecável.',
    placeTag: {
      id: 'chIJf-place-02',
      name: 'Padaria Artesanal Farinha & Flor',
      address: 'Alameda Lorena, 1290 - Jardins',
    },
    likesCount: 14,
    commentsCount: 3,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'post-02',
    author: {
      uid: 'user-pedro',
      name: 'Pedro Lima',
      handle: '@pedrogastro',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    text: 'Acabei de provar o tartare de atum com crocante de tapioca na Maniçoba. Simplesmente surreal! Quem ainda não foi, coloque na wishlist agora mesmo.',
    placeTag: {
      id: 'chIJf-place-01',
      name: 'Maniçoba Bistrô & Café',
      address: 'Rua dos Pinheiros, 452 - Pinheiros',
    },
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    likesCount: 22,
    commentsCount: 5,
    createdAt: Date.now() - 3600000 * 6,
  },
  {
    id: 'post-03',
    author: {
      uid: 'user-lucas',
      name: 'Lucas Ferraz',
      handle: '@lucascoffee',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    text: 'Procurei um bar com bons drinks autorais e ambiente intimista ontem na Vila Madalena. O Amburana Sour do Bar do Canto entregou tudo o que prometeu.',
    placeTag: {
      id: 'chIJf-place-04',
      name: 'Bar do Canto & Coquetelaria',
      address: 'Rua Mourato Coelho, 1022',
    },
    likesCount: 9,
    commentsCount: 1,
    createdAt: Date.now() - 3600000 * 18,
  },
];

export const INITIAL_POST_COMMENTS: Record<string, CommunityComment[]> = {
  'post-01': [
    {
      id: 'pcom-01',
      postId: 'post-01',
      uid: 'user-pedro',
      authorName: 'Pedro Lima',
      authorHandle: '@pedrogastro',
      authorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      text: 'Vai na Farinha & Flor sem pensar duas vezes! O croissant de manteiga francesa lá é o melhor de SP.',
      createdAt: Date.now() - 3600000 * 1,
    },
  ],
};

function notifyCommunityUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('garfo:community_updated'));
  }
}

export function obterPostsComunidade(currentUserUid: string, idsSeguidos: string[]): CommunityPost[] {
  try {
    const raw = localStorage.getItem(LS_COMMUNITY_POSTS_KEY);
    let posts: CommunityPost[] = raw ? JSON.parse(raw) : INITIAL_COMMUNITY_POSTS;
    if (!raw) {
      localStorage.setItem(LS_COMMUNITY_POSTS_KEY, JSON.stringify(INITIAL_COMMUNITY_POSTS));
    }

    const likesRaw = localStorage.getItem(`${LS_POST_LIKES_KEY}_${currentUserUid}`);
    const likesMap: string[] = likesRaw ? JSON.parse(likesRaw) : [];

    // Filtra apenas posts de pessoas que o usuário segue + o próprio usuário
    const permitidos = new Set([...idsSeguidos, currentUserUid]);

    return posts
      .filter((p) => permitidos.has(p.author.uid))
      .map((p) => ({
        ...p,
        userLiked: likesMap.includes(p.id),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return INITIAL_COMMUNITY_POSTS;
  }
}

export function publicarPostComunidade(post: {
  author: { uid: string; name: string; handle: string; photo: string };
  text: string;
  placeTag?: { id: string; name: string; address?: string };
  photoUrl?: string;
}): CommunityPost {
  try {
    const raw = localStorage.getItem(LS_COMMUNITY_POSTS_KEY);
    const posts: CommunityPost[] = raw ? JSON.parse(raw) : INITIAL_COMMUNITY_POSTS;

    const novo: CommunityPost = {
      id: 'post-' + crypto.randomUUID().slice(0, 8),
      author: post.author,
      text: post.text,
      placeTag: post.placeTag,
      photoUrl: post.photoUrl,
      likesCount: 0,
      commentsCount: 0,
      createdAt: Date.now(),
    };

    const atualizados = [novo, ...posts];
    localStorage.setItem(LS_COMMUNITY_POSTS_KEY, JSON.stringify(atualizados));
    notifyCommunityUpdated();
    return novo;
  } catch (err) {
    console.error('Erro ao publicar post na comunidade:', err);
    throw err;
  }
}

export function alternarCurtidaPost(postId: string, currentUserUid: string): boolean {
  try {
    const likesRaw = localStorage.getItem(`${LS_POST_LIKES_KEY}_${currentUserUid}`);
    let likes: string[] = likesRaw ? JSON.parse(likesRaw) : [];
    const jaCurtiu = likes.includes(postId);

    likes = jaCurtiu ? likes.filter((id) => id !== postId) : [...likes, postId];
    localStorage.setItem(`${LS_POST_LIKES_KEY}_${currentUserUid}`, JSON.stringify(likes));

    // Atualiza contador no post
    const raw = localStorage.getItem(LS_COMMUNITY_POSTS_KEY);
    if (raw) {
      const posts: CommunityPost[] = JSON.parse(raw);
      const atualizados = posts.map((p) => {
        if (p.id === postId) {
          return { ...p, likesCount: Math.max(0, p.likesCount + (jaCurtiu ? -1 : 1)) };
        }
        return p;
      });
      localStorage.setItem(LS_COMMUNITY_POSTS_KEY, JSON.stringify(atualizados));
    }

    notifyCommunityUpdated();
    return !jaCurtiu;
  } catch {
    return false;
  }
}

export function carregarComentariosPost(postId: string): CommunityComment[] {
  try {
    const raw = localStorage.getItem(LS_POST_COMMENTS_KEY);
    const map: Record<string, CommunityComment[]> = raw ? JSON.parse(raw) : INITIAL_POST_COMMENTS;
    return map[postId] || [];
  } catch {
    return INITIAL_POST_COMMENTS[postId] || [];
  }
}

export function comentarPostComunidade(
  postId: string,
  comentario: { uid: string; authorName: string; authorHandle: string; authorPhoto: string; text: string }
): CommunityComment {
  try {
    const raw = localStorage.getItem(LS_POST_COMMENTS_KEY);
    const map: Record<string, CommunityComment[]> = raw ? JSON.parse(raw) : INITIAL_POST_COMMENTS;

    const novo: CommunityComment = {
      id: 'pcom-' + crypto.randomUUID().slice(0, 8),
      postId,
      uid: comentario.uid,
      authorName: comentario.authorName,
      authorHandle: comentario.authorHandle,
      authorPhoto: comentario.authorPhoto,
      text: comentario.text,
      createdAt: Date.now(),
    };

    const lista = map[postId] || [];
    map[postId] = [...lista, novo];
    localStorage.setItem(LS_POST_COMMENTS_KEY, JSON.stringify(map));

    // Incrementa commentsCount no post
    const postsRaw = localStorage.getItem(LS_COMMUNITY_POSTS_KEY);
    if (postsRaw) {
      const posts: CommunityPost[] = JSON.parse(postsRaw);
      const atualizados = posts.map((p) => {
        if (p.id === postId) {
          return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
        }
        return p;
      });
      localStorage.setItem(LS_COMMUNITY_POSTS_KEY, JSON.stringify(atualizados));
    }

    notifyCommunityUpdated();
    return novo;
  } catch (err) {
    console.error('Erro ao comentar no post:', err);
    throw err;
  }
}
