import { SAMPLE_PLACES } from './places';
import { obterTodosDestaques } from './dishes';
import type { Place, RankingItem, TopListCategory } from '../types';

export const TOP_LIST_CATEGORIES: TopListCategory[] = [
  {
    id: 'cafes',
    nome: 'Melhor Café & Espresso',
    icone: '',
    descricao: 'As melhores cafeterias de cafés especiais, métodos filtrados e espresso impecável.',
    tags: ['cafe', 'cafeteria', 'coffee', 'espresso', 'torra', 'grao', 'v60'],
  },
  {
    id: 'pizzas',
    nome: 'Melhor Pizza & Trattoria',
    icone: '',
    descricao: 'Pizzas artesanais de fermentação lenta estilo napoletana e massas frescas autênticas.',
    tags: ['pizza', 'napoletana', 'trattoria', 'italiano', 'massa', 'forno'],
  },
  {
    id: 'bares',
    nome: 'Top Bares & Coquetelaria',
    icone: '',
    descricao: 'Coquetéis autorais, cartas de drinks excepcionais e atmosfera noturna marcante.',
    tags: ['bar', 'coquetelaria', 'boteco', 'drink', 'gin', 'sour', 'speakeasy'],
  },
  {
    id: 'padarias',
    nome: 'Melhores Padarias & Brunch',
    icone: '',
    descricao: 'Croissants com manteiga nobre, pães de fermentação natural e viennoiserie.',
    tags: ['bakery', 'padaria', 'croissant', 'sourdough', 'confeitaria', 'brioche', 'brunch'],
  },
  {
    id: 'bistros',
    nome: 'Alta Gastronomia & Bistrôs',
    icone: '',
    descricao: 'Experiências gastronômicas autorais, ingredientes brasileiros e técnicas refinadas.',
    tags: ['bistro', 'restaurant', 'gourmet', 'contemporaneo', 'tartare', 'tucupi', 'menu degustacao'],
  },
  {
    id: 'japoneses',
    nome: 'Melhor Sushi & Japonês',
    icone: '',
    descricao: 'Omakases tradicionais, peixes nobres frescos e sushis executados com maestria.',
    tags: ['japones', 'sushi', 'omakase', 'sashimi', 'izakaya', 'salmao', 'atum'],
  },
  {
    id: 'hamburguer',
    nome: 'Melhores Burgers Artesanais',
    icone: '',
    descricao: 'Burgers no pão brioche amanteigado, smash crocantes e queijos artesanais fundentes.',
    tags: ['burger', 'hamburguer', 'artesanal', 'brioche', 'bacon', 'smash'],
  },
];

export function obterRankingsPorCategoria(
  categoriaId: string,
  cidadeKey?: string
): RankingItem[] {
  const categoria = TOP_LIST_CATEGORIES.find((c) => c.id === categoriaId) || TOP_LIST_CATEGORIES[0];
  const allDishes = obterTodosDestaques();

  // Filtra os lugares de acordo com as tags da categoria
  const placesFiltrados = SAMPLE_PLACES.filter((p) => {
    if (cidadeKey && p.cityKey && p.cityKey !== cidadeKey) {
      // Se tiver cidade específica e não bater, ignora a menos que seja modo global
    }
    const nomeLower = p.name.toLowerCase();
    const tipoLower = (p.tipo || '').toLowerCase();
    const endLower = (p.address || '').toLowerCase();

    return categoria.tags.some(
      (tag) => nomeLower.includes(tag) || tipoLower.includes(tag) || endLower.includes(tag)
    );
  });

  // Se não houver lugar suficiente para a tag, traz os melhores avaliados como complemento
  const listaBase =
    placesFiltrados.length >= 2
      ? placesFiltrados
      : [...placesFiltrados, ...SAMPLE_PLACES.slice(0, 4)];

  // Deduplica
  const unicos = Array.from(new Map(listaBase.map((p) => [p.id, p])).values());

  const rankings: RankingItem[] = unicos.map((p) => {
    // Se não houver contagem real de avaliações, usa 0
    const totalRev = p.reviewsCount || 0;
    const baseRating = p.rating || 0;

    const comida = totalRev > 0 && p.sums?.comida
      ? Number((p.sums.comida / totalRev).toFixed(1))
      : baseRating;

    const ambiente = totalRev > 0 && p.sums?.ambiente
      ? Number((p.sums.ambiente / totalRev).toFixed(1))
      : baseRating;

    const atendimento = totalRev > 0 && p.sums?.atendimento
      ? Number((p.sums.atendimento / totalRev).toFixed(1))
      : baseRating;

    const custoBeneficio = totalRev > 0 && p.sums?.custoBeneficio
      ? Number((p.sums.custoBeneficio / totalRev).toFixed(1))
      : baseRating;

    const notaGeral = totalRev > 0
      ? Number(((comida + ambiente + atendimento + custoBeneficio) / 4).toFixed(1))
      : baseRating;

    // Prato imperdível mais votado para o lugar
    const pratosDoLugar = allDishes.filter((d) => d.placeId === p.id);
    const topPrato = pratosDoLugar[0];

    // Porcentagem de recomendação da comunidade (só calculada se houver avaliações)
    const pct = totalRev > 0 ? Math.min(100, Math.round(notaGeral * 20)) : 0;

    let badgeEspecial: string | undefined;
    if (totalRev >= 50) badgeEspecial = 'Favorito da Comunidade';
    else if (totalRev > 0 && comida >= 4.9) badgeEspecial = 'Comida Nota 5.0';
    else if (totalRev > 0 && ambiente >= 4.9) badgeEspecial = 'Ambiente Impecável';
    else if (totalRev > 0 && custoBeneficio >= 4.6) badgeEspecial = 'Melhor Custo-Benefício';

    return {
      posicao: 1, // calculado após ordenação
      place: p,
      notaGeral,
      totalAvaliacoes: totalRev,
      pratoDestaque: topPrato
        ? { nome: topPrato.dishName, votos: topPrato.votesCount }
        : undefined,
      medias: {
        comida,
        ambiente,
        atendimento,
        custoBeneficio,
      },
      porcentagemRecomendacao: pct,
      badgeEspecial,
    };
  });

  // Ordena por Nota Geral (decrescente) e por total de avaliações
  rankings.sort((a, b) => {
    if (b.notaGeral !== a.notaGeral) return b.notaGeral - a.notaGeral;
    return b.totalAvaliacoes - a.totalAvaliacoes;
  });

  // Atribui a posição final
  return rankings.map((item, index) => ({
    ...item,
    posicao: index + 1,
  }));
}
