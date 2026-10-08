import type { DishHighlight, DishCategory } from '../types';

const LS_DISHES_KEY = 'vimo_dish_highlights_v1';
const LS_DISH_VOTES_KEY = 'vimo_dish_votes_v1';

export const CATEGORIAS_PRATOS: DishCategory[] = [
  'Entrada',
  'Prato Principal',
  'Sobremesa',
  'Bebida & Drink',
  'Café & Confeitaria',
  'Especial da Casa',
];

export const INITIAL_DISH_HIGHLIGHTS: DishHighlight[] = [
  // Maniçoba Bistrô & Café (chIJf-place-01)
  {
    id: 'dish-01',
    placeId: 'chIJf-place-01',
    dishName: 'Tartare de Atum com Crocante de Tapioca',
    category: 'Entrada',
    rating: 5.0,
    isMustTry: true,
    price: 'R$ 58',
    comment: 'Crocância inacreditável da tapioca e molho cítrico de tucupi com tempero amazônico inesquecível.',
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    votesCount: 28,
    author: {
      uid: 'user-camila',
      name: 'Camila Duarte',
      handle: '@camilagourmet',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 2,
  },
  {
    id: 'dish-02',
    placeId: 'chIJf-place-01',
    dishName: 'Peixe do Dia com Pirão de Castanha-do-Pará',
    category: 'Prato Principal',
    rating: 4.8,
    isMustTry: true,
    price: 'R$ 92',
    comment: 'Ponto do peixe impecável, grelhado na manteiga de garrafa e pirão aveludado aromático.',
    photoUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
    votesCount: 19,
    author: {
      uid: 'user-pedro',
      name: 'Pedro Lima',
      handle: '@pedrogastro',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 4,
  },
  {
    id: 'dish-03',
    placeId: 'chIJf-place-01',
    dishName: 'Torta Fondant de Chocolate 70% com Sorvete de Cupuaçu',
    category: 'Sobremesa',
    rating: 5.0,
    isMustTry: true,
    price: 'R$ 36',
    comment: 'Equilíbrio surreal entre a intensidade do cacau brasileiro e o frescor cítrico do cupuaçu.',
    photoUrl: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=900&q=80',
    votesCount: 34,
    author: {
      uid: 'user-bia',
      name: 'Beatriz Ramos',
      handle: '@biaprados',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 5,
  },

  // Padaria Artesanal Farinha & Flor (chIJf-place-02)
  {
    id: 'dish-04',
    placeId: 'chIJf-place-02',
    dishName: 'Croissant Folhado na Manteiga Francesa',
    category: 'Café & Confeitaria',
    rating: 5.0,
    isMustTry: true,
    price: 'R$ 18',
    comment: 'Alvéolos abertos e aerados, dourado brilhante com sabor de manteiga de primeiríssima qualidade.',
    photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',
    votesCount: 42,
    author: {
      uid: 'user-pedro',
      name: 'Pedro Lima',
      handle: '@pedrogastro',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 1,
  },
  {
    id: 'dish-05',
    placeId: 'chIJf-place-02',
    dishName: 'Sourdough Rústico de Alecrim e Sal Maldon',
    category: 'Especial da Casa',
    rating: 4.9,
    isMustTry: true,
    price: 'R$ 34',
    comment: 'Casca extremamente crocante e estaladiça com miolo elástico e acidez equilibrada de fermentação natural.',
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
    votesCount: 25,
    author: {
      uid: 'user-camila',
      name: 'Camila Duarte',
      handle: '@camilagourmet',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 3,
  },

  // Torra Especial & Espresso Bar (chIJf-place-03)
  {
    id: 'dish-06',
    placeId: 'chIJf-place-03',
    dishName: 'Espresso Duplo Microlote Cerrado Mineiro',
    category: 'Café & Confeitaria',
    rating: 4.9,
    isMustTry: true,
    price: 'R$ 14',
    comment: 'Notas elegantes de chocolate amargo, caramelo tostado e acidez málica muito suave.',
    photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    votesCount: 31,
    author: {
      uid: 'user-lucas',
      name: 'Lucas Ferraz',
      handle: '@lucascoffee',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 2,
  },
  {
    id: 'dish-07',
    placeId: 'chIJf-place-03',
    dishName: 'Cookie Artesanal com Flor de Sal e Pedaços de Chocolate 60%',
    category: 'Sobremesa',
    rating: 4.8,
    isMustTry: true,
    price: 'R$ 16',
    comment: 'Massa amanteigada e macia no centro com pedaços derretendo de chocolate nobre.',
    photoUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80',
    votesCount: 22,
    author: {
      uid: 'user-camila',
      name: 'Camila Duarte',
      handle: '@camilagourmet',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 6,
  },

  // Bar do Canto & Coquetelaria (chIJf-place-04)
  {
    id: 'dish-08',
    placeId: 'chIJf-place-04',
    dishName: 'Coquetel Autoral Amburana & Cumaru Sour',
    category: 'Bebida & Drink',
    rating: 5.0,
    isMustTry: true,
    price: 'R$ 44',
    comment: 'Cachaça nobre envelhecida em barris de amburana com aroma amendoado e espuma aveludada.',
    photoUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
    votesCount: 38,
    author: {
      uid: 'user-bia',
      name: 'Beatriz Ramos',
      handle: '@biaprados',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 3,
  },
  {
    id: 'dish-09',
    placeId: 'chIJf-place-04',
    dishName: 'Dadinhos de Tapioca com Geléia de Pimenta Biquinho Defumada',
    category: 'Entrada',
    rating: 4.8,
    isMustTry: true,
    price: 'R$ 38',
    comment: 'Casquinha super crocante e interior fundente de queijo coalho.',
    photoUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=900&q=80',
    votesCount: 29,
    author: {
      uid: 'user-pedro',
      name: 'Pedro Lima',
      handle: '@pedrogastro',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    createdAt: Date.now() - 3600000 * 24 * 4,
  },
];

function notifyDishesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('garfo:dishes_updated'));
  }
}

export function obterTodosDestaques(): DishHighlight[] {
  try {
    const raw = localStorage.getItem(LS_DISHES_KEY);
    if (!raw) {
      localStorage.setItem(LS_DISHES_KEY, JSON.stringify(INITIAL_DISH_HIGHLIGHTS));
      return INITIAL_DISH_HIGHLIGHTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DISH_HIGHLIGHTS;
  }
}

export function obterDestaquesLugar(placeId: string, currentUserUid?: string): DishHighlight[] {
  const all = obterTodosDestaques();
  const votes = obterVotosUsuario(currentUserUid);

  return all
    .filter((d) => d.placeId === placeId)
    .map((d) => ({
      ...d,
      userVoted: votes.includes(d.id),
    }))
    .sort((a, b) => {
      // Imperdíveis primeiro, depois maior nota e mais votos
      if (a.isMustTry !== b.isMustTry) return a.isMustTry ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.votesCount - a.votesCount;
    });
}

function obterVotosUsuario(uid?: string): string[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`${LS_DISH_VOTES_KEY}_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarVotosUsuario(uid: string, votes: string[]) {
  try {
    localStorage.setItem(`${LS_DISH_VOTES_KEY}_${uid}`, JSON.stringify(votes));
  } catch (err) {
    console.error('Erro ao salvar votos do usuário:', err);
  }
}

export function salvarDestaquePrato(
  destaque: Omit<DishHighlight, 'id' | 'createdAt' | 'votesCount'>
): DishHighlight {
  const all = obterTodosDestaques();
  const novo: DishHighlight = {
    ...destaque,
    id: 'dish-' + crypto.randomUUID().slice(0, 8),
    votesCount: 1,
    createdAt: Date.now(),
    userVoted: true,
  };

  const updated = [novo, ...all];
  try {
    localStorage.setItem(LS_DISHES_KEY, JSON.stringify(updated));
    // Marca o voto do próprio criador
    if (destaque.author.uid) {
      const userVotes = obterVotosUsuario(destaque.author.uid);
      if (!userVotes.includes(novo.id)) {
        salvarVotosUsuario(destaque.author.uid, [novo.id, ...userVotes]);
      }
    }
    notifyDishesUpdated();
  } catch (err) {
    console.error('Erro ao salvar destaque de prato:', err);
  }

  return novo;
}

export function alternarVotoPrato(dishId: string, userUid: string): { voted: boolean; count: number } {
  const all = obterTodosDestaques();
  const userVotes = obterVotosUsuario(userUid);
  const jaVotou = userVotes.includes(dishId);

  let novoVotos = jaVotou ? userVotes.filter((id) => id !== dishId) : [...userVotes, dishId];
  salvarVotosUsuario(userUid, novoVotos);

  let newCount = 0;
  const updated = all.map((d) => {
    if (d.id === dishId) {
      newCount = Math.max(0, d.votesCount + (jaVotou ? -1 : 1));
      return { ...d, votesCount: newCount };
    }
    return d;
  });

  try {
    localStorage.setItem(LS_DISHES_KEY, JSON.stringify(updated));
    notifyDishesUpdated();
  } catch (err) {
    console.error('Erro ao alternar voto no prato:', err);
  }

  return { voted: !jaVotou, count: newCount };
}

export function excluirDestaquePrato(dishId: string): void {
  const all = obterTodosDestaques();
  const updated = all.filter((d) => d.id !== dishId);
  try {
    localStorage.setItem(LS_DISHES_KEY, JSON.stringify(updated));
    notifyDishesUpdated();
  } catch (err) {
    console.error('Erro ao excluir destaque:', err);
  }
}
