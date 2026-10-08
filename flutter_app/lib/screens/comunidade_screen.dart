import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/review.dart';
import '../repositories/review_repository.dart';
import '../repositories/place_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/review_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/loading_state.dart';
import 'place_detail_screen.dart';
import 'avaliar_screen.dart';

class ComunidadeScreen extends StatefulWidget {
  const ComunidadeScreen({super.key});

  @override
  State<ComunidadeScreen> createState() => _ComunidadeScreenState();
}

class _ComunidadeScreenState extends State<ComunidadeScreen> with SingleTickerProviderStateMixin {
  final ReviewRepository _reviewRepo = MockReviewRepository.instance;
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;

  late TabController _tabController;
  List<Review> _followingReviews = [];
  List<Review> _discoverReviews = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadFeeds();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFeeds() async {
    setState(() => _isLoading = true);
    final following = await _reviewRepo.getFollowingFeed();
    final discover = await _reviewRepo.getDiscoverFeed();

    if (mounted) {
      setState(() {
        _followingReviews = following;
        _discoverReviews = discover;
        _isLoading = false;
      });
    }
  }

  void _abrirLugar(String placeId) async {
    final place = await _placeRepo.getPlaceById(placeId);
    if (place != null && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => PlaceDetailScreen(place: place),
        ),
      ).then((_) => _loadFeeds());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Atividade'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: VimoColors.accent,
          indicatorWeight: 2.5,
          labelColor: VimoColors.accent,
          unselectedLabelColor: VimoColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: const [
            Tab(text: 'Seguindo'),
            Tab(text: 'Descobrir'),
          ],
        ),
      ),
      body: _isLoading
          ? const LoadingStateWidget(message: 'Carregando relatos da comunidade...')
          : TabBarView(
              controller: _tabController,
              children: [
                // 1. FEED SEGUINDO
                _followingReviews.isEmpty
                    ? const EmptyStateWidget(
                        icon: LucideIcons.users,
                        title: 'Nenhuma atividade recente',
                        description: 'Siga outros críticos gastronômicos para acompanhar onde eles estão comendo.',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadFeeds,
                        color: VimoColors.accent,
                        backgroundColor: VimoColors.surfaceElevated,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: _followingReviews.length,
                          itemBuilder: (context, index) {
                            final rev = _followingReviews[index];
                            return ReviewCard(
                              review: rev,
                              onPlaceTap: () => _abrirLugar(rev.placeId),
                            );
                          },
                        ),
                      ),

                // 2. FEED DESCOBRIR
                _discoverReviews.isEmpty
                    ? const EmptyStateWidget(
                        icon: LucideIcons.compass,
                        title: 'Nenhuma avaliação encontrada',
                        description: 'Avaliações populares e em destaque aparecerão aqui.',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadFeeds,
                        color: VimoColors.accent,
                        backgroundColor: VimoColors.surfaceElevated,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: _discoverReviews.length,
                          itemBuilder: (context, index) {
                            final rev = _discoverReviews[index];
                            return ReviewCard(
                              review: rev,
                              onPlaceTap: () => _abrirLugar(rev.placeId),
                            );
                          },
                        ),
                      ),
              ],
            ),
    );
  }
}
