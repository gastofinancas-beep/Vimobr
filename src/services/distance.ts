/**
 * Calcula a distância geodésica precisa em metros entre dois pontos geográficos (Fórmula de Haversine).
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formata a distância de forma amigável ao usuário.
 * Exemplo:
 * - 850 m
 * - 2,4 km
 * - 8,7 km
 * - 19,5 km
 */
export function formatarDistanciaAmigavel(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  const km = metros / 1000;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Converte o código de priceLevel do Google Places para símbolo amigável ($, $$, $$$, $$$$)
 */
export function formatarPriceLevel(priceLevel?: string): string {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 'Grátis';
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$$';
    default:
      return '';
  }
}

/**
 * Traduz e formata os tipos de restaurantes do Google Places para rótulos legíveis em português.
 */
export function formatarTipoRestaurante(primaryType?: string, types: string[] = []): string {
  const t = (primaryType || types[0] || '').toLowerCase();

  const mapa: Record<string, string> = {
    pizza_restaurant: 'Pizzaria',
    pizzeria: 'Pizzaria',
    hamburger_restaurant: 'Hamburgueria',
    fast_food_restaurant: 'Fast Food',
    brazilian_restaurant: 'Comida Brasileira',
    italian_restaurant: 'Comida Italiana',
    japanese_restaurant: 'Comida Japonesa',
    sushi_restaurant: 'Sushi Bar',
    chinese_restaurant: 'Comida Chinesa',
    seafood_restaurant: 'Frutos do Mar',
    steak_house: 'Churrascaria',
    barbecue_restaurant: 'Churrasco',
    cafe: 'Cafeteria',
    coffee_shop: 'Café',
    bakery: 'Padaria & Confeitaria',
    pastry_shop: 'Confeitaria',
    bar: 'Bar & Coquetelaria',
    wine_bar: 'Wine Bar',
    bistro: 'Bistrô',
    mexican_restaurant: 'Comida Mexicana',
    vegetarian_restaurant: 'Vegetariano',
    vegan_restaurant: 'Vegano',
    ice_cream_shop: 'Sorveteria',
    meal_takeaway: 'Lanchonete',
    restaurant: 'Restaurante',
  };

  if (mapa[t]) return mapa[t];

  for (const type of types) {
    const lt = type.toLowerCase();
    if (mapa[lt]) return mapa[lt];
  }

  return 'Restaurante';
}
