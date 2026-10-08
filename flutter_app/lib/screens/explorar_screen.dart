import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/place.dart';
import '../repositories/place_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/place_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/loading_state.dart';
import 'mapa_screen.dart';
import 'place_detail_screen.dart';

enum OrdenacaoExplorar {
  recomendados,
  maisBemAvaliados,
  maisProximos,
  maisAvaliados,
  maisRecentes,
}

class ExplorarScreen extends StatefulWidget {
  const ExplorarScreen({super.key});

  @override
  State<ExplorarScreen> createState() => _ExplorarScreenState();
}

class _ExplorarScreenState extends State<ExplorarScreen> {
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;
  final TextEditingController _searchController = TextEditingController();

  String _selectedCategory = 'Todos';
  String _searchQuery = '';
  OrdenacaoExplorar _ordenacao = OrdenacaoExplorar.recomendados;
  double _minRating = 0.0;
  String? _selectedPrice;
  bool _somenteAbertos = false;

  List<Place> _places = [];
  final Set<String> _savedPlaceIds = {};
  bool _isLoading = true;

  final List<String> _categories = [
    'Todos',
    'Restaurantes',
    'Cafés',
    'Bares',
    'Padarias',
    'Japonês',
    'Italiano',
    'Hambúrguer',
  ];

  @override
  void initState() {
    super.initState();
    _fetchPlaces();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchPlaces() async {
    setState(() => _isLoading = true);
    final results = await _placeRepo.getPlaces(
      query: _searchQuery,
      category: _selectedCategory,
    );
    final saved = await _placeRepo.getSavedPlaces();

    if (mounted) {
      setState(() {
        _places = results;
        _savedPlaceIds.clear();
        _savedPlaceIds.addAll(saved.map((p) => p.id));
        _isLoading = false;
      });
    }
  }

  void _abrirFiltros() {
    showModalBottomSheet(
      context: context,
      backgroundColor: VimoColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: VimoColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filtros de Descoberta',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: VimoColors.textPrimary,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          setModalState(() {
                            _minRating = 0.0;
                            _selectedPrice = null;
                            _somenteAbertos = false;
                          });
                        },
                        child: const Text('Limpar', style: TextStyle(color: VimoColors.accent, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Nota Mínima
                  const Text('Nota Mínima VIMO', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 8),
                  Row(
                    children: [0.0, 4.0, 4.5, 4.8].map((rating) {
                      final isSel = _minRating == rating;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isSel ? VimoColors.accent : VimoColors.surfaceElevated,
                              side: BorderSide(color: isSel ? VimoColors.accent : VimoColors.border),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onPressed: () => setModalState(() => _minRating = rating),
                            child: Text(
                              rating == 0.0 ? 'Qualquer' : '★ ${rating.toStringAsFixed(1)}+',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                                color: isSel ? VimoColors.background : VimoColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Faixa de Preço
                  const Text('Faixa de Preço', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 8),
                  Row(
                    children: ['\$', '\$\$', '\$\$\$', '\$\$\$\$'].map((price) {
                      final isSel = _selectedPrice == price;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isSel ? VimoColors.accent : VimoColors.surfaceElevated,
                              side: BorderSide(color: isSel ? VimoColors.accent : VimoColors.border),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onPressed: () {
                              setModalState(() {
                                _selectedPrice = isSel ? null : price;
                              });
                            },
                            child: Text(
                              price,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isSel ? VimoColors.background : VimoColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        setState(() {});
                      },
                      child: const Text('Aplicar Filtros'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _abrirOrdenacao() {
    showModalBottomSheet(
      context: context,
      backgroundColor: VimoColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: VimoColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Ordenar Resultados',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: VimoColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              _buildSortOption('Recomendados pelo VIMO', OrdenacaoExplorar.recomendados),
              _buildSortOption('Mais bem avaliados (Nota)', OrdenacaoExplorar.maisBemAvaliados),
              _buildSortOption('Mais próximos de mim', OrdenacaoExplorar.maisProximos),
              _buildSortOption('Mais avaliados (Popularidade)', OrdenacaoExplorar.maisAvaliados),
              _buildSortOption('Mais recentes no guia', OrdenacaoExplorar.maisRecentes),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSortOption(String label, OrdenacaoExplorar option) {
    final isSelected = _ordenacao == option;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          color: isSelected ? VimoColors.accent : VimoColors.textPrimary,
        ),
      ),
      trailing: isSelected ? const Icon(Icons.check_rounded, color: VimoColors.accent) : null,
      onTap: () {
        setState(() => _ordenacao = option);
        Navigator.pop(context);
      },
    );
  }

  List<Place> get _filteredAndSortedPlaces {
    var list = List<Place>.from(_places);

    if (_minRating > 0) {
      list = list.where((p) => p.rating >= _minRating).toList();
    }
    if (_selectedPrice != null) {
      list = list.where((p) => p.priceLevel == _selectedPrice).toList();
    }

    switch (_ordenacao) {
      case OrdenacaoExplorar.maisBemAvaliados:
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case OrdenacaoExplorar.maisAvaliados:
        list.sort((a, b) => b.reviewsCount.compareTo(a.reviewsCount));
        break;
      case OrdenacaoExplorar.maisProximos:
        list.sort((a, b) => (a.distanceKm ?? 999).compareTo(b.distanceKm ?? 999));
        break;
      default:
        break;
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final places = _filteredAndSortedPlaces;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Explorar'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.map, size: 20, color: VimoColors.accent),
            tooltip: 'Ver Mapa',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const MapaScreen()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. BARRA DE BUSCA + BOTÃO DE FILTROS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) {
                      _searchQuery = val;
                      _fetchPlaces();
                    },
                    decoration: InputDecoration(
                      hintText: 'Restaurantes, cafés, culinária...',
                      prefixIcon: const Icon(LucideIcons.search, size: 18, color: VimoColors.accent),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                                _fetchPlaces();
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _abrirFiltros,
                  child: Container(
                    height: 50,
                    width: 50,
                    decoration: BoxDecoration(
                      color: (_minRating > 0 || _selectedPrice != null)
                          ? VimoColors.accent.withOpacity(0.15)
                          : VimoColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: (_minRating > 0 || _selectedPrice != null)
                            ? VimoColors.accent
                            : VimoColors.border,
                      ),
                    ),
                    child: Icon(
                      LucideIcons.slidersHorizontal,
                      size: 20,
                      color: (_minRating > 0 || _selectedPrice != null)
                          ? VimoColors.accent
                          : VimoColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // 2. CHIPS DE CATEGORIAS
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;

                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedCategory = cat);
                    _fetchPlaces();
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: isSelected ? VimoColors.accent : VimoColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: isSelected ? VimoColors.accent : VimoColors.border),
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? VimoColors.background : VimoColors.textPrimary,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // 3. BARRA DE STATUS / ORDENAÇÃO
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${places.length} lugares encontrados',
                  style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary, fontWeight: FontWeight.w600),
                ),
                GestureDetector(
                  onTap: _abrirOrdenacao,
                  child: Row(
                    children: const [
                      Icon(LucideIcons.arrowUpDown, size: 13, color: VimoColors.accent),
                      SizedBox(width: 4),
                      Text(
                        'Ordenar',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: VimoColors.accent),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 4. LISTA DE RESULTADOS
          Expanded(
            child: _isLoading
                ? const LoadingStateWidget(message: 'Filtrando estabelecimentos...')
                : places.isEmpty
                    ? EmptyStateWidget(
                        icon: LucideIcons.searchX,
                        title: 'Nenhum lugar encontrado',
                        description: 'Tente alterar os filtros de busca ou buscar por outro termo ou bairro.',
                        actionLabel: 'Limpar busca',
                        onAction: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _selectedCategory = 'Todos';
                            _minRating = 0.0;
                            _selectedPrice = null;
                          });
                          _fetchPlaces();
                        },
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: places.length,
                        itemBuilder: (context, index) {
                          final place = places[index];
                          return PlaceCard(
                            place: place,
                            isSaved: _savedPlaceIds.contains(place.id),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => PlaceDetailScreen(place: place),
                                ),
                              ).then((_) => _fetchPlaces());
                            },
                            onSaveTap: () async {
                              await _placeRepo.toggleSave(place.id);
                              setState(() {
                                if (_savedPlaceIds.contains(place.id)) {
                                  _savedPlaceIds.remove(place.id);
                                } else {
                                  _savedPlaceIds.add(place.id);
                                }
                              });
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
