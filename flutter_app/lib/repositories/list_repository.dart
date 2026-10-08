import '../models/restaurant_list.dart';

abstract class ListRepository {
  Future<List<RestaurantList>> getUserLists(String userId);
  Future<RestaurantList?> getListById(String id);
  Future<void> createList(RestaurantList list);
  Future<void> addPlaceToList(String listId, String placeId);
  Future<void> removePlaceFromList(String listId, String placeId);
}

class MockListRepository implements ListRepository {
  static final MockListRepository instance = MockListRepository._internal();
  MockListRepository._internal();

  final List<RestaurantList> _lists = [
    RestaurantList(
      id: 'list-1',
      userId: 'user-me',
      name: 'Quero conhecer em SP',
      description: 'Lugares recomendados por críticos e amigos para visitar em breve.',
      coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      placeIds: ['p1', 'p3'],
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
    ),
    RestaurantList(
      id: 'list-2',
      userId: 'user-me',
      name: 'Cafés especiais para trabalhar',
      description: 'Lugares com bom café filtrado, mesas confortáveis e tomadas.',
      coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      placeIds: ['p2'],
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),
    RestaurantList(
      id: 'list-3',
      userId: 'user-me',
      name: 'Jantares a dois inesquecíveis',
      description: 'Ambientes intimistas com carta de vinhos e comida autoral refinada.',
      coverImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
      placeIds: ['p1', 'p4'],
      createdAt: DateTime.now().subtract(const Duration(days: 45)),
    ),
  ];

  @override
  Future<List<RestaurantList>> getUserLists(String userId) async {
    await Future.delayed(const Duration(milliseconds: 100));
    return _lists.where((l) => l.userId == userId).toList();
  }

  @override
  Future<RestaurantList?> getListById(String id) async {
    try {
      return _lists.firstWhere((l) => l.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> createList(RestaurantList list) async {
    _lists.insert(0, list);
  }

  @override
  Future<void> addPlaceToList(String listId, String placeId) async {
    final idx = _lists.indexWhere((l) => l.id == listId);
    if (idx >= 0 && !_lists[idx].placeIds.contains(placeId)) {
      _lists[idx] = _lists[idx].copyWith(
        placeIds: [..._lists[idx].placeIds, placeId],
      );
    }
  }

  @override
  Future<void> removePlaceFromList(String listId, String placeId) async {
    final idx = _lists.indexWhere((l) => l.id == listId);
    if (idx >= 0) {
      _lists[idx] = _lists[idx].copyWith(
        placeIds: _lists[idx].placeIds.where((id) => id != placeId).toList(),
      );
    }
  }
}
