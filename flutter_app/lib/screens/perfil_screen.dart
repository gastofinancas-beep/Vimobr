import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../models/user_profile.dart';
import '../models/review.dart';
import '../models/place.dart';
import '../models/restaurant_list.dart';
import '../repositories/user_repository.dart';
import '../repositories/review_repository.dart';
import '../repositories/place_repository.dart';
import '../repositories/list_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/empty_state.dart';
import '../widgets/loading_state.dart';
import 'place_detail_screen.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> with SingleTickerProviderStateMixin {
  final UserRepository _userRepo = MockUserRepository.instance;
  final ReviewRepository _reviewRepo = MockReviewRepository.instance;
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;
  final ListRepository _listRepo = MockListRepository.instance;

  late TabController _tabController;
  UserProfile? _user;
  List<Review> _myReviews = [];
  List<Place> _savedPlaces = [];
  List<RestaurantList> _myLists = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final user = await _userRepo.getCurrentUser();
    final reviews = await _reviewRepo.getReviews(userId: user.uid);
    final saved = await _placeRepo.getSavedPlaces();
    final lists = await _listRepo.getUserLists(user.uid);

    if (mounted) {
      setState(() {
        _user = user;
        _myReviews = reviews;
        _savedPlaces = saved;
        _myLists = lists;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _user == null) {
      return const Scaffold(
        body: Center(child: LoadingStateWidget(message: 'Carregando perfil...')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perfil'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.settings, size: 18, color: VimoColors.textSecondary),
            onPressed: () {},
          ),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  children: [
                    // FOTO + NOME + USERNAME
                    CircleAvatar(
                      radius: 38,
                      backgroundImage: CachedNetworkImageProvider(_user!.photoUrl),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _user!.displayName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _user!.handle,
                      style: const TextStyle(fontSize: 13, color: VimoColors.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'São Paulo',
                      style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                    ),

                    const SizedBox(height: 16),

                    // ESTATÍSTICAS SIMPLES
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('${_myReviews.length} avaliações', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        const Text(' · ', style: TextStyle(color: VimoColors.textSecondary)),
                        Text('${_savedPlaces.length} salvos', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // LINHA HORIZONTAL COM 4 FOTOS DE FAVORITOS
                    if (_savedPlaces.isNotEmpty) ...[
                      SizedBox(
                        height: 70,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _savedPlaces.take(4).length,
                          itemBuilder: (context, index) {
                            final place = _savedPlaces[index];
                            return GestureDetector(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (context) => PlaceDetailScreen(place: place)),
                                );
                              },
                              child: Container(
                                width: 70,
                                height: 70,
                                margin: const EdgeInsets.only(right: 8),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: CachedNetworkImage(
                                    imageUrl: place.photoUrl,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
            ),

            // ABAS: DIÁRIO | LISTAS
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverTabBarDelegate(
                TabBar(
                  controller: _tabController,
                  indicatorColor: VimoColors.textPrimary,
                  indicatorWeight: 2,
                  labelColor: VimoColors.textPrimary,
                  unselectedLabelColor: VimoColors.textSecondary,
                  labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  tabs: const [
                    Tab(text: 'Diário'),
                    Tab(text: 'Listas'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            // 1. DIÁRIO CRONOLÓGICO
            _myReviews.isEmpty
                ? const EmptyStateWidget(
                    icon: LucideIcons.bookOpen,
                    title: 'Seu diário está vazio',
                    description: 'Suas visitas e resenhas aparecerão aqui.',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _myReviews.length,
                    itemBuilder: (context, index) {
                      final rev = _myReviews[index];
                      final dateFormatted = DateFormat('dd MMM', 'pt_BR').format(rev.createdAt);
                      final monthYear = DateFormat('MMMM yyyy', 'pt_BR').format(rev.createdAt).toUpperCase();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$dateFormatted · ${rev.placeName}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: VimoColors.textSecondary),
                            ),
                            const SizedBox(height: 6),
                            if (rev.placePhotoUrl != null) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: AspectRatio(
                                  aspectRatio: 16 / 9,
                                  child: CachedNetworkImage(
                                    imageUrl: rev.placePhotoUrl!,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            Row(
                              children: [
                                Text(
                                  '★ ${rev.rating.toStringAsFixed(1)}',
                                  style: const TextStyle(fontWeight: FontWeight.w800, color: VimoColors.accent, fontSize: 13),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              rev.text,
                              style: const TextStyle(fontSize: 14, height: 1.4, color: VimoColors.textPrimary),
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: VimoColors.border),
                          ],
                        ),
                      );
                    },
                  ),

            // 2. LISTAS
            ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _myLists.length,
              itemBuilder: (context, index) {
                final list = _myLists[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: VimoColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: VimoColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        list.name,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${list.placeIds.length} lugares',
                        style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _SliverTabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: VimoColors.background,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabBarDelegate oldDelegate) => false;
}
