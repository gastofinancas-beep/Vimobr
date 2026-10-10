import { Review } from '../types';

export type BadgeTier = 'bronze' | 'prata' | 'ouro' | 'diamante';

export interface Badge {
  id: string;
  titulo: string;
  descricao: string;
  pistaSecreta: string;
  icone: string;
  categoria: 'Avaliações' | 'Culinária' | 'Comunidade' | 'Especial';
  tier: BadgeTier;
  meta: number;
  progressoAtual: number;
  desbloqueada: boolean;
  dataDesbloqueio?: string;
  pontos: number;
}

export interface ConquistasSummary {
  badges: Badge[];
  desbloqueadas: Badge[];
  bloqueadas: Badge[];
  totalPontos: number;
  nivelAtual: number;
  nomeNivel: string;
  proximoNivelPontos: number;
  progressoNivelPct: number;
  topBadge?: Badge;
}

export function calcularConquistasUsuario(reviews: Review[]): Badge[] {
  const totalAvaliacoes = reviews.length;

  let cafes = 0;
  let pizzarias = 0;
  let bares = 0;
  let padarias = 0;
  let asiaticos = 0;
  let carnesBurger = 0;
  let comAmigos = 0;
  let comFotos = 0;
  let avaliacoesDetalhadas = 0;
  let totalCurtidas = 0;
  const cidadesSet = new Set<string>();

  reviews.forEach((r) => {
    const nome = (r.placeName || '').toLowerCase();
    const texto = (r.text || '').toLowerCase();

    // Categorias de lugares
    if (nome.includes('café') || nome.includes('cafe') || nome.includes('espresso') || nome.includes('torra') || texto.includes('café')) {
      cafes++;
    }
    if (nome.includes('pizza') || nome.includes('trattoria') || nome.includes('forno') || texto.includes('pizza') || texto.includes('massa')) {
      pizzarias++;
    }
    if (nome.includes('bar') || nome.includes('boteco') || nome.includes('pub') || nome.includes('coquetel') || texto.includes('drink') || texto.includes('cerveja')) {
      bares++;
    }
    if (nome.includes('padaria') || nome.includes('bakery') || nome.includes('croissant') || texto.includes('pão') || texto.includes('panificação')) {
      padarias++;
    }
    if (nome.includes('sushi') || nome.includes('ramen') || nome.includes('japa') || nome.includes('izakaya') || texto.includes('sushi') || texto.includes('oriental')) {
      asiaticos++;
    }
    if (nome.includes('burger') || nome.includes('hamburg') || nome.includes('churrasco') || nome.includes('parrilla') || nome.includes('steak') || texto.includes('carne')) {
      carnesBurger++;
    }

    if (r.companions && r.companions.length > 0) {
      comAmigos++;
    }

    if ((r.photos && r.photos.length > 0) || r.placePhotoUrl || r.placePhotoName) {
      comFotos++;
    }

    if (r.ratings && (r.ratings.comida || r.ratings.ambiente || r.ratings.atendimento) && r.text && r.text.length > 30) {
      avaliacoesDetalhadas++;
    }

    totalCurtidas += r.likesCount || 0;
    if (r.cityKey) cidadesSet.add(r.cityKey);
  });

  return [
    {
      id: 'primeira-ida',
      titulo: 'Primeira ida',
      descricao: 'Registrou a primeira ida no diário.',
      pistaSecreta: 'Registre sua primeira ida para liberar.',
      icone: 'flag',
      categoria: 'Avaliações',
      tier: 'bronze',
      meta: 1,
      progressoAtual: Math.min(1, totalAvaliacoes),
      desbloqueada: totalAvaliacoes >= 1,
      pontos: 50,
    },
    // === MARCOS ALTOS E DIFÍCEIS DE AVALIAÇÕES ===
    {
      id: 'critico-gourmet',
      titulo: '5 idas',
      descricao: 'Registrou 5 idas no diário.',
      pistaSecreta: 'Registre 5 idas para liberar.',
      icone: 'flame',
      categoria: 'Avaliações',
      tier: 'prata',
      meta: 5,
      progressoAtual: Math.min(5, totalAvaliacoes),
      desbloqueada: totalAvaliacoes >= 5,
      pontos: 250,
    },
    {
      id: 'top-critico-consagrado',
      titulo: '15 idas',
      descricao: 'Registrou 15 idas no diário.',
      pistaSecreta: 'Registre 15 idas para liberar.',
      icone: 'crown',
      categoria: 'Avaliações',
      tier: 'ouro',
      meta: 15,
      progressoAtual: Math.min(15, totalAvaliacoes),
      desbloqueada: totalAvaliacoes >= 15,
      pontos: 750,
    },
    {
      id: 'lenda-do-guia',
      titulo: '30 idas',
      descricao: 'Registrou 30 idas no diário.',
      pistaSecreta: 'Registre 30 idas para liberar.',
      icone: 'trophy',
      categoria: 'Avaliações',
      tier: 'diamante',
      meta: 30,
      progressoAtual: Math.min(30, totalAvaliacoes),
      desbloqueada: totalAvaliacoes >= 30,
      pontos: 2000,
    },

    // === MISTÉRIOS DE CULINÁRIA E ESPECIALIDADES (DIFÍCEIS DE CONSEGUIR) ===
    {
      id: 'alquimista-dos-cafes',
      titulo: 'Rota do café',
      descricao: 'Avaliou 5 cafés.',
      pistaSecreta: 'Avalie 5 cafés para liberar.',
      icone: 'coffee',
      categoria: 'Culinária',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, cafes),
      desbloqueada: cafes >= 5,
      pontos: 500,
    },
    {
      id: 'mestre-do-levain',
      titulo: 'Rota da padaria',
      descricao: 'Avaliou 5 padarias.',
      pistaSecreta: 'Avalie 5 padarias para liberar.',
      icone: 'bakery',
      categoria: 'Culinária',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, padarias),
      desbloqueada: padarias >= 5,
      pontos: 500,
    },
    {
      id: 'balcao-autoral',
      titulo: 'Rota dos bares',
      descricao: 'Avaliou 5 bares.',
      pistaSecreta: 'Avalie 5 bares para liberar.',
      icone: 'drink',
      categoria: 'Culinária',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, bares),
      desbloqueada: bares >= 5,
      pontos: 500,
    },
    {
      id: 'connoisseur-napoletano',
      titulo: 'Rota da pizza',
      descricao: 'Avaliou 5 pizzarias ou cantinas.',
      pistaSecreta: 'Avalie 5 pizzarias ou cantinas para liberar.',
      icone: 'pizza',
      categoria: 'Culinária',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, pizzarias),
      desbloqueada: pizzarias >= 5,
      pontos: 500,
    },

    // === CONQUISTAS ESPECIAIS E MISTERIOSAS ===
    {
      id: 'olhar-do-esteta',
      titulo: 'Fotógrafo',
      descricao: 'Publicou 6 idas com fotos.',
      pistaSecreta: 'Publique 6 idas com fotos para liberar.',
      icone: 'camera',
      categoria: 'Especial',
      tier: 'prata',
      meta: 6,
      progressoAtual: Math.min(6, comFotos),
      desbloqueada: comFotos >= 6,
      pontos: 400,
    },
    {
      id: 'paladar-cirurgico',
      titulo: 'Detalhista',
      descricao: 'Fez 5 avaliações com texto e notas por critério.',
      pistaSecreta: 'Escreva 5 avaliações completas para liberar.',
      icone: 'pen',
      categoria: 'Especial',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, avaliacoesDetalhadas),
      desbloqueada: avaliacoesDetalhadas >= 5,
      pontos: 600,
    },
    {
      id: 'mesa-farta-e-amigos',
      titulo: 'Boa companhia',
      descricao: 'Marcou amigos em 5 idas.',
      pistaSecreta: 'Marque amigos em 5 idas para liberar.',
      icone: 'users',
      categoria: 'Comunidade',
      tier: 'ouro',
      meta: 5,
      progressoAtual: Math.min(5, comAmigos),
      desbloqueada: comAmigos >= 5,
      pontos: 600,
    },
    {
      id: 'influencia-culinaria',
      titulo: 'Referência',
      descricao: 'Recebeu 25 curtidas nas avaliações.',
      pistaSecreta: 'Receba 25 curtidas para liberar.',
      icone: 'heart',
      categoria: 'Comunidade',
      tier: 'diamante',
      meta: 25,
      progressoAtual: Math.min(25, totalCurtidas),
      desbloqueada: totalCurtidas >= 25,
      pontos: 1200,
    },
  ];
}

export function obterResumoConquistas(reviews: Review[]): ConquistasSummary {
  const badges = calcularConquistasUsuario(reviews);
  const desbloqueadas = badges.filter((b) => b.desbloqueada);
  const bloqueadas = badges.filter((b) => !b.desbloqueada);

  const totalPontos = desbloqueadas.reduce((acc, b) => acc + b.pontos, 0);

  const niveis = [
    { nivel: 1, nome: 'Iniciante', min: 0, max: 500 },
    { nivel: 2, nome: 'Frequente', min: 500, max: 1200 },
    { nivel: 3, nome: 'Experiente', min: 1200, max: 2500 },
    { nivel: 4, nome: 'Referência', min: 2500, max: 5000 },
  ];

  const nivelInfo = niveis.find((n) => totalPontos < n.max) || niveis[niveis.length - 1];
  const faixaPontos = nivelInfo.max - nivelInfo.min;
  const pontosNoNivel = Math.max(0, totalPontos - nivelInfo.min);
  const progressoNivelPct = Math.min(100, Math.round((pontosNoNivel / faixaPontos) * 100));

  const tierWeights: Record<BadgeTier, number> = { diamante: 4, ouro: 3, prata: 2, bronze: 1 };
  const topBadge = [...desbloqueadas].sort((a, b) => tierWeights[b.tier] - tierWeights[a.tier] || b.pontos - a.pontos)[0];

  return {
    badges,
    desbloqueadas,
    bloqueadas,
    totalPontos,
    nivelAtual: nivelInfo.nivel,
    nomeNivel: nivelInfo.nome,
    proximoNivelPontos: nivelInfo.max,
    progressoNivelPct,
    topBadge,
  };
}
