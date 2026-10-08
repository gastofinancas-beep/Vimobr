import type { Place } from '../types';

export interface CriterioPersonalizado {
  key: string;
  label: string;
  dica?: string;
}

export type TipoLugar =
  | 'cafe'
  | 'padaria'
  | 'hamburgueria'
  | 'pizzaria'
  | 'bar'
  | 'japones'
  | 'doceria'
  | 'churrascaria'
  | 'italiano'
  | 'restaurante';

export function detectarTipoLugar(place?: Place | null): TipoLugar {
  if (!place) return 'restaurante';
  const texto = `${place.name || ''} ${place.cuisine || ''} ${place.category || ''} ${place.tipo || ''}`.toLowerCase();

  if (
    texto.includes('café') ||
    texto.includes('cafe') ||
    texto.includes('coffee') ||
    texto.includes('espresso') ||
    texto.includes('torrefacao') ||
    texto.includes('torrefação') ||
    texto.includes('coado') ||
    texto.includes('specialty coffee')
  ) {
    return 'cafe';
  }
  if (
    texto.includes('sorvete') ||
    texto.includes('gelato') ||
    texto.includes('doceria') ||
    texto.includes('confeitaria') ||
    texto.includes('doce') ||
    texto.includes('chocolate') ||
    texto.includes('bolo') ||
    texto.includes('torta')
  ) {
    return 'doceria';
  }
  if (
    texto.includes('padaria') ||
    texto.includes('panificadora') ||
    texto.includes('bakery') ||
    texto.includes('pão') ||
    texto.includes('pao') ||
    texto.includes('croissant') ||
    texto.includes('brunch') ||
    texto.includes('fornada')
  ) {
    return 'padaria';
  }
  if (
    texto.includes('burger') ||
    texto.includes('hamburguer') ||
    texto.includes('hambúrguer') ||
    texto.includes('smash') ||
    texto.includes('lanche') ||
    texto.includes('sanduiche') ||
    texto.includes('sanduíche')
  ) {
    return 'hamburgueria';
  }
  if (
    texto.includes('pizza') ||
    texto.includes('pizzaria') ||
    texto.includes('forno a lenha') ||
    texto.includes('napoletana') ||
    texto.includes('napolitana')
  ) {
    return 'pizzaria';
  }
  if (
    texto.includes('sushi') ||
    texto.includes('japones') ||
    texto.includes('japonês') ||
    texto.includes('temaki') ||
    texto.includes('ramen') ||
    texto.includes('izakaya') ||
    texto.includes('omakase') ||
    texto.includes('poke') ||
    texto.includes('asian') ||
    texto.includes('asiático')
  ) {
    return 'japones';
  }
  if (
    texto.includes('bar') ||
    texto.includes('boteco') ||
    texto.includes('pub') ||
    texto.includes('cerveja') ||
    texto.includes('coquetel') ||
    texto.includes('drinks') ||
    texto.includes('cocktail') ||
    texto.includes('choperia') ||
    texto.includes('chopp') ||
    texto.includes('speakeasy')
  ) {
    return 'bar';
  }
  if (
    texto.includes('churrasco') ||
    texto.includes('churrascaria') ||
    texto.includes('steak') ||
    texto.includes('parrilla') ||
    texto.includes('carne') ||
    texto.includes('costela') ||
    texto.includes('grelhados')
  ) {
    return 'churrascaria';
  }
  if (
    texto.includes('trattoria') ||
    texto.includes('cantina') ||
    texto.includes('pasta') ||
    texto.includes('massa') ||
    texto.includes('italiano') ||
    texto.includes('ristorante')
  ) {
    return 'italiano';
  }

  return 'restaurante';
}

export function obterCriteriosParaLugar(place?: Place | null): {
  tipoId: TipoLugar;
  tipoNome: string;
  criterios: CriterioPersonalizado[];
} {
  const tipo = detectarTipoLugar(place);

  switch (tipo) {
    case 'cafe':
      return {
        tipoId: 'cafe',
        tipoNome: 'Cafeteria & Café Especial',
        criterios: [
          { key: 'cafe', label: 'Café & Espresso', dica: 'Extração, aroma, acidez e corpo' },
          { key: 'doces', label: 'Doces & Sobremesas', dica: 'Bolos, cookies, brownies e tortas' },
          { key: 'salgados', label: 'Comidinhas & Salgados', dica: 'Pão de queijo, toasts e quiches' },
          { key: 'ambiente', label: 'Ambiente & Conforto', dica: 'Música, tomadas, iluminação e espaço' },
          { key: 'atendimento', label: 'Atendimento & Barista', dica: 'Simpatia, agilidade e cuidado' },
        ],
      };

    case 'padaria':
      return {
        tipoId: 'padaria',
        tipoNome: 'Padaria & Confeitaria Artesanal',
        criterios: [
          { key: 'salgados', label: 'Pães & Fornada', dica: 'Crocância, miolo, fermentação natural' },
          { key: 'doces', label: 'Doces & Confeitaria', dica: 'Croissants, folhados e doces' },
          { key: 'cafe', label: 'Café & Bebidas', dica: 'Espresso, pingado e sucos' },
          { key: 'comida', label: 'Lanches & Pratos', dica: 'Misto quente, ovos mexidos e sanduíches' },
          { key: 'atendimento', label: 'Atendimento & Balcão', dica: 'Rapidez e cordialidade' },
        ],
      };

    case 'doceria':
      return {
        tipoId: 'doceria',
        tipoNome: 'Doceria, Confeitaria & Sorvetes',
        criterios: [
          { key: 'doces', label: 'Doces & Sobremesas', dica: 'Equilíbrio de açúcar, sabor e textura' },
          { key: 'frescor', label: 'Frescor & Cremosidade', dica: 'Ponto do sorvete, crocância e recheio' },
          { key: 'apresentacao', label: 'Apresentação & Vitrine', dica: 'Visual dos doces e embalagens' },
          { key: 'cafe', label: 'Cafés & Bebidas', dica: 'Cafés e acompanhamentos' },
          { key: 'atendimento', label: 'Atendimento', dica: 'Atenção e agilidade' },
        ],
      };

    case 'hamburgueria':
      return {
        tipoId: 'hamburgueria',
        tipoNome: 'Hamburgueria',
        criterios: [
          { key: 'comida', label: 'Hambúrguer & Blend', dica: 'Ponto da carne, suculência e sabor' },
          { key: 'massa', label: 'Pão & Montagem', dica: 'Maciez do pão, tostagem e proporção' },
          { key: 'acompanhamentos', label: 'Batatas & Acompanhamentos', dica: 'Crocância e molhos da casa' },
          { key: 'sobremesa', label: 'Milkshakes & Sobremesa', dica: 'Cremosidade e sabor' },
          { key: 'atendimento', label: 'Atendimento & Ambiente', dica: 'Agilidade e clima da casa' },
        ],
      };

    case 'pizzaria':
      return {
        tipoId: 'pizzaria',
        tipoNome: 'Pizzaria',
        criterios: [
          { key: 'massa', label: 'Massa & Borda', dica: 'Fermentação, crocância e leveza' },
          { key: 'comida', label: 'Molho & Recheio', dica: 'Qualidade do queijo e frescor do molho' },
          { key: 'sobremesa', label: 'Pizzas Doces & Sobremesas', dica: 'Equilíbrio e sabor' },
          { key: 'bebidas', label: 'Vinhos & Bebidas', dica: 'Carta de vinhos e chopp' },
          { key: 'atendimento', label: 'Atendimento & Forno', dica: 'Tempo de espera e serviço' },
        ],
      };

    case 'japones':
      return {
        tipoId: 'japones',
        tipoNome: 'Culinária Japonesa & Asiática',
        criterios: [
          { key: 'comida', label: 'Frescor dos Peixes & Shari', dica: 'Corte, temperatura do arroz e tempero' },
          { key: 'pratoPrincipal', label: 'Pratos Quentes & Especiais', dica: 'Grelhados, ramens, tempurá e robatas' },
          { key: 'sobremesa', label: 'Sobremesa', dica: 'Mochis, choux cream e doces asiáticos' },
          { key: 'bebidas', label: 'Saquês & Bebidas', dica: 'Carta de saquês e coquetelaria autoral' },
          { key: 'atendimento', label: 'Atendimento & Serviço', dica: 'Atenção e ritmo dos pratos' },
        ],
      };

    case 'bar':
      return {
        tipoId: 'bar',
        tipoNome: 'Bar, Boteco & Coquetelaria',
        criterios: [
          { key: 'drinks', label: 'Drinks & Coquetéis', dica: 'Equilíbrio alcoólico, gelo e receita autoral' },
          { key: 'bebidas', label: 'Cerveja & Chopp', dica: 'Temperatura e colarinho' },
          { key: 'salgados', label: 'Petiscos & Porções', dica: 'Crocância, tempero e quantidade' },
          { key: 'ambiente', label: 'Vibe & Música', dica: 'Clima, iluminação e som ambiente' },
          { key: 'atendimento', label: 'Atendimento & Agilidade', dica: 'Atenção da equipe e do balcão' },
        ],
      };

    case 'churrascaria':
      return {
        tipoId: 'churrascaria',
        tipoNome: 'Carnes & Churrasco',
        criterios: [
          { key: 'comida', label: 'Ponto & Suculência das Carnes', dica: 'Ponto de cocção, corte e maciez' },
          { key: 'acompanhamentos', label: 'Acompanhamentos & Guarnições', dica: 'Farofas, vinagrete, saladas e mandioca' },
          { key: 'sobremesa', label: 'Sobremesa', dica: 'Pudim, abacaxi grelhado e tortas' },
          { key: 'bebidas', label: 'Carta de Bebidas & Vinhos', dica: 'Harmonização com carnes' },
          { key: 'atendimento', label: 'Serviço & Atendimento', dica: 'Ritmo das carnes e atenção' },
        ],
      };

    case 'italiano':
      return {
        tipoId: 'italiano',
        tipoNome: 'Culinária Italiana & Trattoria',
        criterios: [
          { key: 'entrada', label: 'Entradas & Antepastos', dica: 'Focaccias, burratas e carpaccios' },
          { key: 'pratoPrincipal', label: 'Massa Fresca & Prato Principal', dica: 'Ponto al dente e riqueza dos molhos' },
          { key: 'sobremesa', label: 'Sobremesa', dica: 'Tiramisù, panna cotta e cannoli' },
          { key: 'bebidas', label: 'Carta de Vinhos & Drinks', dica: 'Harmonização e digestivos' },
          { key: 'ambiente', label: 'Ambiente & Aconchego', dica: 'Clima intimista e conforto' },
          { key: 'atendimento', label: 'Atendimento', dica: 'Cortesia e cuidado dos garçons' },
        ],
      };

    default:
      return {
        tipoId: 'restaurante',
        tipoNome: 'Restaurante & Gastronomia',
        criterios: [
          { key: 'entrada', label: 'Entrada & Petiscos', dica: 'Apresentação, frescor e sabor inicial' },
          { key: 'pratoPrincipal', label: 'Prato Principal', dica: 'Ponto de cocção, textura e tempero' },
          { key: 'sobremesa', label: 'Sobremesa', dica: 'Harmonia doce, textura e apresentação' },
          { key: 'bebidas', label: 'Bebidas & Vinhos', dica: 'Carta de vinhos, drinks e coquetéis' },
          { key: 'ambiente', label: 'Ambiente & Conforto', dica: 'Iluminação, acústica e decoração' },
          { key: 'atendimento', label: 'Atendimento & Serviço', dica: 'Tempo de espera, cortesia e cuidado' },
        ],
      };
  }
}
