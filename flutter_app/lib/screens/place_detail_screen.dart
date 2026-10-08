import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../models/place.dart';
import '../models/review.dart';
import '../repositories/place_repository.dart';
import '../repositories/review_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/review_card.dart';
import 'avaliar_screen.dart';

class PlaceDetailScreen extends StatefulWidget {
  final Place place;

  const PlaceDetailScreen({super.key, required this.place});

  @override
  State<PlaceDetailScreen> createState() => _PlaceDetailScreenState();
}

class _PlaceDetailScreenState extends State<PlaceDetailScreen> {
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;
  final ReviewRepository _reviewRepo = MockReviewRepository.instance;

  late Place _place;
  List<Review> _reviews = [];
  bool _isSaved = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _place = widget.place;
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() => _isLoading = true);
    final saved = await _placeRepo.isSaved(_place.id);
    final reviews = await _reviewRepo.getReviews(placeId: _place.id);

    if (mounted) {
      setState(() {
        _isSaved = saved;
        _reviews = reviews;
        _isLoading = false;
      });
    }
  }

  void _toggleSave() async {
    await _placeRepo.toggleSave(_place.id);
    setState(() {
      _isSaved = !_isSaved;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isSaved ? 'Salvo na lista "Quero Conhecer"!' : 'Removido dos salvos.'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _abrirMapa() async {
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${_place.lat},${_place.lng}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  void _abrirAvaliar() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AvaliarScreen(initialPlace: _place),
      ),
    ).then((_) => _loadDetails());
  }

  Map<String, int> _calcularPratosMaisCitados() {
    final Map<String, int> contagem = {};
    for (final rev in _reviews) {
      for (final prato in rev.dishesOrdered) {
        final nome = prato.trim();
        if (nome.isNotEmpty) {
          contagem[nome] = (contagem[nome] ?? 0) + 1;
        }
      }
    }
    return contagem;
  }

  @override
  Widget build(BuildContext context) {
    final pratosMaisCitados = _calcularPratosMaisCitados();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 1. HERO IMAGE COM BOTÕES VOLTAR, SALVAR E COMPARTILHAR
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: VimoColors.background,
            leading: Padding(
              padding: const EdgeInsets.all(8.0),
              child: CircleAvatar(
                backgroundColor: Colors.black.withOpacity(0.65),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: _place.photoUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(color: VimoColors.surfaceElevated),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.5),
                          Colors.transparent,
                          VimoColors.background,
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: CircleAvatar(
                  backgroundColor: Colors.black.withOpacity(0.65),
                  child: IconButton(
                    icon: Icon(
                      _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      color: _isSaved ? VimoColors.accent : Colors.white,
                      size: 20,
                    ),
                    onPressed: _toggleSave,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12, left: 4),
                child: CircleAvatar(
                  backgroundColor: Colors.black.withOpacity(0.65),
                  child: IconButton(
                    icon: const Icon(LucideIcons.share2, color: Colors.white, size: 18),
                    onPressed: () {
                      Share.share(
                        'Confira ${_place.name} no VIMO! Diário e avaliações gastronômicas.',
                      );
                    },
                  ),
                ),
              ),
            ],
          ),

          // 2. CONTEÚDO PRINCIPAL DO RESTAURANTE
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // NOME + PREÇO
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          _place.name,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.8,
                            color: VimoColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _place.priceLevel,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: VimoColors.accent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // CATEGORIA · BAIRRO · DISTÂNCIA
                  Text(
                    '${_place.category} · ${_place.neighborhood ?? _place.city ?? "São Paulo"}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: VimoColors.textSecondary,
                    ),
                  ),

                  const SizedBox(height: 14),

                  // NOTAS (VIMO + GOOGLE) & QUANTIDADE
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: VimoColors.accent.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: VimoColors.accent.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, size: 16, color: VimoColors.accent),
                            const SizedBox(width: 4),
                            Text(
                              _place.rating.toStringAsFixed(1),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: VimoColors.accent,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'VIMO',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: VimoColors.accent),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${_place.reviewsCount + _reviews.length} avaliações da comunidade',
                        style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // 3. BOTÕES DE AÇÃO (CTAs)
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: const Icon(LucideIcons.plus, size: 18),
                          label: const Text('Avaliar Visita'),
                          onPressed: _abrirAvaliar,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: Icon(
                            _isSaved ? Icons.check_rounded : Icons.bookmark_border_rounded,
                            size: 18,
                            color: _isSaved ? VimoColors.accent : VimoColors.textPrimary,
                          ),
                          label: Text(_isSaved ? 'Salvo' : 'Quero conhecer'),
                          onPressed: _toggleSave,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),
                  const Divider(color: VimoColors.border),
                  const SizedBox(height: 20),

                  // 4. SOBRE & INFORMAÇÕES
                  const Text(
                    'Sobre o Lugar',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: VimoColors.surface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: VimoColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(LucideIcons.mapPin, size: 16, color: VimoColors.accent),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _place.address,
                                style: const TextStyle(fontSize: 13, height: 1.4),
                              ),
                            ),
                          ],
                        ),
                        if (_place.openingHours != null) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(LucideIcons.clock, size: 16, color: VimoColors.accent),
                              const SizedBox(width: 10),
                              Text(
                                _place.openingHours!,
                                style: const TextStyle(fontSize: 13),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            icon: const Icon(LucideIcons.map, size: 16),
                            label: const Text('Abrir no Google Maps'),
                            onPressed: _abrirMapa,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // 5. ESTATÍSTICAS DO VIMO
                  const Text(
                    'Estatísticas VIMO',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      _buildStatCard('Nota Média', _place.rating.toStringAsFixed(1), '★'),
                      const SizedBox(width: 10),
                      _buildStatCard('Avaliações', '${_place.reviewsCount + _reviews.length}', 'resenhas'),
                      const SizedBox(width: 10),
                      _buildStatCard('Salvos', '342', 'listas'),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // 6. PRATOS MAIS CITADOS PELOS CRÍTICOS
                  if (pratosMaisCitados.isNotEmpty) ...[
                    const Text(
                      'Pratos Mais Citados',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: pratosMaisCitados.entries.map((entry) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: VimoColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: VimoColors.border),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(LucideIcons.utensils, size: 13, color: VimoColors.accent),
                              const SizedBox(width: 6),
                              Text(
                                entry.key,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${entry.value}x',
                                style: const TextStyle(fontSize: 11, color: VimoColors.textSecondary),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 28),
                  ],

                  // 7. AVALIAÇÕES DA COMUNIDADE
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Diário & Avaliações',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                      ),
                      Text(
                        '${_reviews.length} relatos',
                        style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  if (_reviews.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: VimoColors.surface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: VimoColors.border),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(LucideIcons.messageSquareDashed, size: 32, color: VimoColors.textSecondary),
                            const SizedBox(height: 12),
                            const Text(
                              'Seja o primeiro a avaliar!',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Compartilhe suas impressões, pratos favoritos e dicas.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: VimoColors.textSecondary, fontSize: 12),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _abrirAvaliar,
                              child: const Text('Escrever Avaliação'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    ..._reviews.map((rev) => ReviewCard(review: rev)),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, String unit) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: VimoColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: VimoColors.border),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: VimoColors.accent,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: VimoColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
