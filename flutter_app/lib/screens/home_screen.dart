import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/place.dart';
import '../models/review.dart';
import '../repositories/place_repository.dart';
import '../repositories/review_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/empty_state.dart';
import '../widgets/loading_state.dart';
import 'place_detail_screen.dart';
import 'explorar_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onAbrirAvaliar;

  const HomeScreen({super.key, this.onAbrirAvaliar});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;
  final ReviewRepository _reviewRepo = MockReviewRepository.instance;

  String _filtroAtual = 'Perto';
  List<Place> _places = [];
  List<Review> _reviews = [];
  bool _isLoading = true;
  final Set<String> _savedPlaceIds = {};

  final List<String> _chips = ['Perto', 'Cafés', 'Jantar', 'Almoço', 'Favoritos'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final places = await _placeRepo.getPlaces();
    final reviews = await _reviewRepo.getFollowingFeed();
    final saved = await _placeRepo.getSavedPlaces();

    if (mounted) {
      setState(() {
        _places = places;
        _reviews = reviews;
        _savedPlaceIds.clear();
        _savedPlaceIds.addAll(saved.map((p) => p.id));
        _isLoading = false;
      });
    }
  }

  void _abrirLugar(Place place) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => PlaceDetailScreen(place: place),
      ),
    ).then((_) => _loadData());
  }

  void _toggleSave(Place place) async {
    await _placeRepo.toggleSave(place.id);
    setState(() {
      if (_savedPlaceIds.contains(place.id)) {
        _savedPlaceIds.remove(place.id);
      } else {
        _savedPlaceIds.add(place.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: SafeArea(
          child: LoadingStateWidget(message: 'Preparando seu diário...'),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: VimoColors.accent,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // HEADER: VIMO + CIDADE + NOTIFICAÇÕES
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'VIMO',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.8,
                            color: VimoColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'São Paulo',
                          style: TextStyle(
                            fontSize: 12,
                            color: VimoColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.bell, size: 18, color: VimoColors.textSecondary),
                      onPressed: () {},
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // BUSCA SIMPLES
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const ExplorarScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: VimoColors.surfaceSecondary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: VimoColors.border),
                    ),
                    child: Row(
                      children: const [
                        Icon(LucideIcons.search, size: 16, color: VimoColors.textSecondary),
                        SizedBox(width: 10),
                        Text(
                          'Buscar restaurantes, cafés e bares',
                          style: TextStyle(fontSize: 14, color: VimoColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // CHIPS "PARA VOCÊ"
                SizedBox(
                  height: 32,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _chips.length,
                    itemBuilder: (context, index) {
                      final chip = _chips[index];
                      final isSelected = _filtroAtual == chip;
                      return GestureDetector(
                        onTap: () => setState(() => _filtroAtual = chip),
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? VimoColors.textPrimary : VimoColors.surfaceSecondary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            chip,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? VimoColors.surface : VimoColors.textPrimary,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 28),

                // SEÇÃO: DESCUBRA (FOTO + NOME + CATEGORIA + NOTA + SALVAR)
                const Text(
                  'Descubra',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 14),

                ..._places.take(3).map((place) {
                  final isSaved = _savedPlaceIds.contains(place.id);
                  return GestureDetector(
                    onTap: () => _abrirLugar(place),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: AspectRatio(
                              aspectRatio: 16 / 9,
                              child: CachedNetworkImage(
                                imageUrl: place.photoUrl,
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(color: VimoColors.surfaceSecondary),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  place.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: VimoColors.textPrimary,
                                  ),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _toggleSave(place),
                                child: Icon(
                                  isSaved ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                  size: 20,
                                  color: isSaved ? VimoColors.accent : VimoColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${place.category} · ${place.priceLevel}',
                            style: const TextStyle(fontSize: 13, color: VimoColors.textSecondary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '★ ${place.rating.toStringAsFixed(1)} · ${place.neighborhood ?? "São Paulo"}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VimoColors.accent),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                const SizedBox(height: 24),

                // SEÇÃO: BEM AVALIADOS
                const Text(
                  'Bem avaliados',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 12),

                ..._places.skip(1).take(2).map((place) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    onTap: () => _abrirLugar(place),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(
                        imageUrl: place.photoUrl,
                        width: 50,
                        height: 50,
                        fit: BoxFit.cover,
                      ),
                    ),
                    title: Text(
                      place.name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    subtitle: Text(
                      '${place.category} · ★ ${place.rating.toStringAsFixed(1)}',
                      style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                    ),
                  );
                }),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
