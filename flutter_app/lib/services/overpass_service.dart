import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../models/osm_restaurant.dart';

class OverpassException implements Exception {
  final String message;
  const OverpassException(this.message);

  @override
  String toString() => message;
}

class OverpassService {
  static const String _overpassEndpoint = 'https://overpass-api.de/api/interpreter';
  static const int _defaultRadiusMeters = 3000;

  // Cache simples em memória para evitar chamadas redundantes repetidas
  static final Map<String, List<OsmRestaurant>> _cache = {};
  static final Map<String, DateTime> _cacheTimestamps = {};
  static const Duration _cacheDuration = Duration(minutes: 5);

  /// Busca restaurantes próximos no OpenStreetMap via Overpass API
  static Future<List<OsmRestaurant>> fetchNearbyRestaurants({
    required double latitude,
    required double longitude,
    int radiusMeters = _defaultRadiusMeters,
    bool forceRefresh = false,
  }) async {
    // Chave de cache arredondada (~100m de tolerância)
    final cacheKey = '${latitude.toStringAsFixed(3)}_${longitude.toStringAsFixed(3)}_$radiusMeters';

    if (!forceRefresh && _cache.containsKey(cacheKey)) {
      final timestamp = _cacheTimestamps[cacheKey];
      if (timestamp != null && DateTime.now().difference(timestamp) < _cacheDuration) {
        debugPrint('OverpassService: Retornando restaurantes do cache para $cacheKey');
        return _cache[cacheKey]!;
      }
    }

    // Consulta Overpass QL para nós (node) e vias (way) de alimentação
    final query = '''
[out:json][timeout:20];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|pub|bistro|ice_cream"](around:$radiusMeters,$latitude,$longitude);
  node["shop"~"bakery|pastry"](around:$radiusMeters,$latitude,$longitude);
  way["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:$radiusMeters,$latitude,$longitude);
);
out center 40;
''';

    try {
      final response = await http
          .post(
            Uri.parse(_overpassEndpoint),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'GarfoApp/1.0 (https://garfo.app)',
            },
            body: {'data': query},
          )
          .timeout(const Duration(seconds: 25));

      if (response.statusCode != 200) {
        throw OverpassException(
          'Falha na resposta do OpenStreetMap (HTTP ${response.statusCode}).',
        );
      }

      final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      final elements = (data['elements'] as List<dynamic>?) ?? [];

      final List<OsmRestaurant> restaurants = [];

      for (final element in elements) {
        if (element is! Map<String, dynamic>) continue;

        // Obter latitude e longitude
        double elLat = 0.0;
        double elLng = 0.0;

        if (element.containsKey('lat') && element.containsKey('lon')) {
          elLat = (element['lat'] as num).toDouble();
          elLng = (element['lon'] as num).toDouble();
        } else if (element.containsKey('center')) {
          final center = element['center'] as Map<String, dynamic>;
          elLat = (center['lat'] as num).toDouble();
          elLng = (center['lon'] as num).toDouble();
        } else {
          continue;
        }

        // Calcular distância real em metros
        final distance = Geolocator.distanceBetween(
          latitude,
          longitude,
          elLat,
          elLng,
        );

        final restaurant = OsmRestaurant.fromOverpassJson(
          element,
          userLat: latitude,
          userLng: longitude,
          distance: distance,
        );

        restaurants.add(restaurant);
      }

      // Ordenar por proximidade do usuário
      restaurants.sort((a, b) => (a.distanceMeters ?? 0).compareTo(b.distanceMeters ?? 0));

      // Atualizar cache
      _cache[cacheKey] = restaurants;
      _cacheTimestamps[cacheKey] = DateTime.now();

      return restaurants;
    } catch (e) {
      if (e is OverpassException) rethrow;
      throw OverpassException('Não foi possível carregar os restaurantes: $e');
    }
  }

  /// Limpa o cache
  static void clearCache() {
    _cache.clear();
    _cacheTimestamps.clear();
  }
}
