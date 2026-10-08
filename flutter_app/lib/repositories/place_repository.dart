import '../models/place.dart';
import '../services/mock_data.dart';
import '../services/google_places_service.dart';

abstract class PlaceRepository {
  Future<List<Place>> getPlaces({String? query, String? category});
  Future<Place?> getPlaceById(String id);
  Future<List<Place>> getTrendingNear({double? lat, double? lng});
  Future<List<Place>> getTopRated();
  Future<bool> isSaved(String placeId);
  Future<void> toggleSave(String placeId);
  Future<List<Place>> getSavedPlaces();
}

class MockPlaceRepository implements PlaceRepository {
  final Set<String> _savedPlaceIds = {'p1', 'p2'};
  final List<Place> _places = List.from(MockData.places);

  static final MockPlaceRepository instance = MockPlaceRepository._internal();
  MockPlaceRepository._internal();

  @override
  Future<List<Place>> getPlaces({String? query, String? category}) async {
    await Future.delayed(const Duration(milliseconds: 150));
    var results = List<Place>.from(_places);

    if (category != null && category.isNotEmpty && category != 'Todos') {
      results = results.where((p) =>
        p.category.toLowerCase().contains(category.toLowerCase()) ||
        p.tags.any((t) => t.toLowerCase().contains(category.toLowerCase()))
      ).toList();
    }

    if (query != null && query.trim().isNotEmpty) {
      final q = query.toLowerCase().trim();
      results = results.where((p) =>
        p.name.toLowerCase().contains(q) ||
        p.category.toLowerCase().contains(q) ||
        p.address.toLowerCase().contains(q) ||
        p.tags.any((t) => t.toLowerCase().contains(q))
      ).toList();
    }

    return results;
  }

  @override
  Future<Place?> getPlaceById(String id) async {
    await Future.delayed(const Duration(milliseconds: 50));
    try {
      return _places.firstWhere((p) => p.id == id);
    } catch (_) {
      // Tenta buscar no Google Places se não estiver na lista local
      return GooglePlacesService.getPlaceDetails(id);
    }
  }

  @override
  Future<List<Place>> getTrendingNear({double? lat, double? lng}) async {
    await Future.delayed(const Duration(milliseconds: 100));
    return _places.take(6).toList();
  }

  @override
  Future<List<Place>> getTopRated() async {
    await Future.delayed(const Duration(milliseconds: 100));
    final sorted = List<Place>.from(_places)
      ..sort((a, b) => b.rating.compareTo(a.rating));
    return sorted;
  }

  @override
  Future<bool> isSaved(String placeId) async {
    return _savedPlaceIds.contains(placeId);
  }

  @override
  Future<void> toggleSave(String placeId) async {
    if (_savedPlaceIds.contains(placeId)) {
      _savedPlaceIds.remove(placeId);
    } else {
      _savedPlaceIds.add(placeId);
    }
  }

  @override
  Future<List<Place>> getSavedPlaces() async {
    return _places.where((p) => _savedPlaceIds.contains(p.id)).toList();
  }

  void addOrUpdatePlace(Place place) {
    final idx = _places.indexWhere((p) => p.id == place.id);
    if (idx >= 0) {
      _places[idx] = place;
    } else {
      _places.add(place);
    }
  }
}
