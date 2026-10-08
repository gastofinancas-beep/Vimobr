import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/place.dart';
import '../models/review.dart';
import '../repositories/place_repository.dart';
import '../repositories/review_repository.dart';
import '../repositories/user_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/star_rating.dart';

class AvaliarScreen extends StatefulWidget {
  final Place? initialPlace;

  const AvaliarScreen({super.key, this.initialPlace});

  @override
  State<AvaliarScreen> createState() => _AvaliarScreenState();
}

class _AvaliarScreenState extends State<AvaliarScreen> {
  final PlaceRepository _placeRepo = MockPlaceRepository.instance;
  final ReviewRepository _reviewRepo = MockReviewRepository.instance;
  final UserRepository _userRepo = MockUserRepository.instance;

  Place? _selectedPlace;
  double _rating = 5.0;
  final TextEditingController _reviewTextController = TextEditingController();
  List<Place> _availablePlaces = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedPlace = widget.initialPlace;
    _loadPlaces();
  }

  Future<void> _loadPlaces() async {
    final places = await _placeRepo.getPlaces();
    if (mounted) {
      setState(() {
        _availablePlaces = places;
        _selectedPlace ??= places.isNotEmpty ? places.first : null;
      });
    }
  }

  @override
  void dispose() {
    _reviewTextController.dispose();
    super.dispose();
  }

  bool get _isValid => _selectedPlace != null && _reviewTextController.text.trim().isNotEmpty;

  void _saveReview() async {
    if (!_isValid || _isSaving) return;

    setState(() => _isSaving = true);
    final user = await _userRepo.getCurrentUser();

    final newReview = Review(
      id: 'r-${DateTime.now().millisecondsSinceEpoch}',
      placeId: _selectedPlace!.id,
      placeName: _selectedPlace!.name,
      placeCategory: _selectedPlace!.category,
      placePhotoUrl: _selectedPlace!.photoUrl,
      userId: user.uid,
      userName: user.displayName,
      userHandle: user.handle,
      userAvatarUrl: user.photoUrl,
      rating: _rating,
      text: _reviewTextController.text.trim(),
      createdAt: DateTime.now(),
      visitedAt: DateTime.now(),
    );

    await _reviewRepo.createReview(newReview);

    if (mounted) {
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Avaliação publicada no diário.')),
      );
    }
  }

  void _escolherRestaurante() {
    showModalBottomSheet(
      context: context,
      backgroundColor: VimoColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _availablePlaces.length,
          itemBuilder: (context, index) {
            final place = _availablePlaces[index];
            return ListTile(
              title: Text(place.name, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(place.category, style: const TextStyle(fontSize: 12, color: VimoColors.textSecondary)),
              onTap: () {
                setState(() => _selectedPlace = place);
                Navigator.pop(context);
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nova avaliação'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _isValid && !_isSaving ? _saveReview : null,
              child: Text(
                'Publicar',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: _isValid ? VimoColors.textPrimary : VimoColors.textSecondary,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ESCOLHER RESTAURANTE
            GestureDetector(
              onTap: _escolherRestaurante,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: VimoColors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: VimoColors.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      _selectedPlace?.name ?? 'Escolher restaurante',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const Icon(Icons.keyboard_arrow_down_rounded, color: VimoColors.textSecondary),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 28),

            // ESCOLHER NOTA
            Center(
              child: Column(
                children: [
                  StarRating(
                    rating: _rating,
                    size: 32,
                    interactive: true,
                    onRatingChanged: (r) => setState(() => _rating = r),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _rating.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: VimoColors.accent),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // ESCREVER EXPERIÊNCIA
            TextField(
              controller: _reviewTextController,
              maxLines: 6,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'Escreva sobre sua experiência...',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
