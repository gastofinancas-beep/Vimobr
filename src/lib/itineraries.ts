import { GastronomicItinerary } from '../types';

const LS_ITINERARIES_KEY = 'vimo_gastronomic_itineraries_v1';

const DEFAULT_ITINERARIES: GastronomicItinerary[] = [
  {
    id: 'itinerary-1',
    title: 'Melhores Hambúrgueres Artesanais de SP',
    description: 'Um roteiro imperdível pelas hamburguerias mais suculentas e autênticas da capital paulista.',
    creatorUid: 'user-me',
    creatorName: 'Pedro Otávio',
    creatorHandle: '@pedrootavio',
    creatorPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    placeIds: ['place-1', 'place-3', 'place-5'],
    createdAt: Date.now() - 86400000 * 3,
    likesCount: 28,
  },
  {
    id: 'itinerary-2',
    title: 'Cafés Especiais e Pães de Fermentação Natural',
    description: 'Para começar o dia com o pé direito: cafeterias aconchegantes e padarias artesanais.',
    creatorUid: 'user-2',
    creatorName: 'Mariana Costa',
    creatorHandle: '@maricosta',
    creatorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    placeIds: ['place-2', 'place-4'],
    createdAt: Date.now() - 86400000 * 5,
    likesCount: 42,
  },
];

export function carregarItinerarios(): GastronomicItinerary[] {
  try {
    const raw = localStorage.getItem(LS_ITINERARIES_KEY);
    if (!raw) {
      localStorage.setItem(LS_ITINERARIES_KEY, JSON.stringify(DEFAULT_ITINERARIES));
      return DEFAULT_ITINERARIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ITINERARIES;
  }
}

export function salvarItinerario(itinerary: GastronomicItinerary) {
  const list = carregarItinerarios();
  const index = list.findIndex((i) => i.id === itinerary.id);
  if (index >= 0) {
    list[index] = itinerary;
  } else {
    list.unshift(itinerary);
  }
  localStorage.setItem(LS_ITINERARIES_KEY, JSON.stringify(list));
}

export function excluirItinerario(id: string) {
  const list = carregarItinerarios().filter((i) => i.id !== id);
  localStorage.setItem(LS_ITINERARIES_KEY, JSON.stringify(list));
}
