export type Criterio =
  | 'entrada'
  | 'pratoPrincipal'
  | 'sobremesa'
  | 'bebidas'
  | 'ambiente'
  | 'atendimento'
  | 'custoBeneficio'
  | 'comida';

export interface CriterioInfo {
  key: Criterio;
  label: string;
  icone: string;
  dica: string;
  categoria: 'Culinária' | 'Experiência & Serviço';
}

export const CRITERIOS: CriterioInfo[] = [
  { key: 'entrada', label: 'Entrada', icone: '', dica: 'Apresentação, frescor e temperatura', categoria: 'Culinária' },
  { key: 'pratoPrincipal', label: 'Prato Principal', icone: '', dica: 'Ponto de cocção, textura e tempero', categoria: 'Culinária' },
  { key: 'comida', label: 'Comida', icone: '', dica: 'Sabor, ponto e apresentação', categoria: 'Culinária' },
  { key: 'ambiente', label: 'Ambiente', icone: '', dica: 'Acústica, iluminação e conforto', categoria: 'Experiência & Serviço' },
  { key: 'atendimento', label: 'Atendimento', icone: '', dica: 'Tempo de espera, cortesia e agilidade', categoria: 'Experiência & Serviço' },
  { key: 'bebidas', label: 'Bebidas', icone: '', dica: 'Temperatura, cafés, vinhos e coquetéis', categoria: 'Culinária' },
];

export type Ratings = Partial<Record<Criterio, number>> & {
  entrada?: number;
  pratoPrincipal?: number;
  sobremesa?: number;
  bebidas?: number;
  ambiente?: number;
  atendimento?: number;
  custoBeneficio?: number;
  comida?: number;
};

export type FeedMode = 'cidade' | 'outra' | 'algoritmo';

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  photoName?: string;
  photoUrl?: string;
  priceLevel?: string;
  cityKey?: string;
  cityName?: string;
  reviewsCount?: number;
  sums?: Ratings;
  rating?: number;
  googleRating?: number;
  googleUserRatingCount?: number;
  vimoRating?: number | null;
  vimoReviewsCount?: number;
  tipo?: 'restaurant' | 'cafe' | 'bakery' | 'bar' | string;
  distanceKm?: number;
  openNow?: boolean;
  bairro?: string;
  phone?: string;
  cuisine?: string;
  category?: string;
  coverImage?: string;
  photos?: string[];
}

export type CompanionStatus = 'pendente' | 'aprovado_coautor' | 'aprovado_presenca' | 'recusado';

export interface ReviewCompanion {
  uid: string;
  name: string;
  handle: string;
  photo: string;
  status: CompanionStatus;
  respondedAt?: number;
}

export type VereditoCritico =
  | 'imperdivel'
  | 'recomendado'
  | 'vale_a_pena'
  | 'regular'
  | 'superestimado'
  | 'nao_recomendo';

export type OcasiaoIdeal =
  | 'encontro'
  | 'comemoracao'
  | 'amigos'
  | 'trabalho'
  | 'solo';

export type VoltariaOpcao = 'com_certeza' | 'talvez' | 'nao';

export type PrecoPercepcao = 'caro' | 'justo' | 'barato';

export interface PratoAvaliado {
  id: string;
  nome: string;
  nota: number;
  comentario?: string;
  tipo?: 'entrada' | 'principal' | 'sobremesa' | 'bebida';
}

export interface Review {
  id: string;
  uid: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  placeId: string;
  placeName: string;
  placePhotoName?: string;
  placePhotoUrl?: string;
  cityKey: string;
  cityName: string;
  ratings: Ratings;
  overall: number;
  text: string;
  photos: string[];
  peoplePhotos?: string[];
  menuPhotos: string[];
  visitedAt: number;
  createdAt: number;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  companions?: ReviewCompanion[];
  // Dimensões Críticas Gastronômicas Aprofundadas:
  tituloReview?: string;
  veredito?: VereditoCritico;
  pratoDestaque?: string;
  pratoEvitar?: string;
  pontoFraco?: string;
  bebidaDestaque?: string;
  tempoEspera?: string;
  voltaria?: VoltariaOpcao;
  precoPercepcao?: PrecoPercepcao;
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
}

export interface FoodTweet {
  id: string;
  uid: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  text: string;
  photoUrl?: string;
  placeId?: string;
  placeName?: string;
  cityName?: string;
  createdAt: number;
  likesCount: number;
  repostsCount: number;
  commentsCount: number;
  userLiked?: boolean;
  userReposted?: boolean;
  isMutual?: boolean;
}

export interface TweetComment {
  id: string;
  tweetId: string;
  uid: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  uid: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
  parentId?: string;
  likesCount?: number;
  userLiked?: boolean;
}

export interface WishlistItem {
  placeId: string;
  placeName: string;
  placeAddress?: string;
  placePhotoUrl?: string;
  placePhotoName?: string;
  rating?: number;
  tipo?: string;
  priceLevel?: string;
  addedAt: number;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  handle: string;
  photoURL: string;
  bio?: string;
  homeCityKey: string;
  homeCityName: string;
  followersCount: number;
  followingCount: number;
  /** Plano da conta: 'pro' libera a vitrine de medalhas no perfil. */
  plano?: 'gratis' | 'pro';
  queroIr?: string[];
  jaFui?: string[];
  wishlist?: WishlistItem[];
}

export interface PlaceList {
  id: string;
  name: string;
  placeIds: string[];
}

export type NotificationType = 'curtida' | 'comentario' | 'marcacao_presenca' | 'seguir';

export interface NotificationItem {
  id: string;
  tipo: NotificationType;
  remetente: {
    uid: string;
    name: string;
    handle: string;
    photo: string;
  };
  reviewId?: string;
  placeId?: string;
  placeName?: string;
  texto?: string;
  lida: boolean;
  createdAt: number;
  companionStatus?: CompanionStatus;
}

export type DishCategory = 'Entrada' | 'Prato Principal' | 'Sobremesa' | 'Bebida & Drink' | 'Café & Confeitaria' | 'Especial da Casa';

export interface DishHighlight {
  id: string;
  placeId: string;
  dishName: string;
  category: DishCategory;
  rating: number; // 0.5 a 5.0
  isMustTry: boolean; // "Imperdível"
  photoUrl?: string;
  comment?: string;
  price?: string;
  author: {
    uid: string;
    name: string;
    handle: string;
    photo: string;
  };
  votesCount: number;
  userVoted?: boolean;
  createdAt: number;
}

export interface RankingItem {
  posicao: number;
  place: Place;
  notaGeral: number;
  totalAvaliacoes: number;
  pratoDestaque?: {
    nome: string;
    votos: number;
  };
  medias: {
    comida: number;
    ambiente: number;
    atendimento: number;
    custoBeneficio: number;
  };
  porcentagemRecomendacao: number;
  badgeEspecial?: string;
}

export interface TopListCategory {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  tags: string[];
}

export interface GastronomicItinerary {
  id: string;
  title: string;
  description: string;
  creatorUid: string;
  creatorName: string;
  creatorHandle: string;
  creatorPhoto: string;
  placeIds: string[];
  createdAt: number;
  likesCount?: number;
}
