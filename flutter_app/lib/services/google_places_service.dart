import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/google_place_restaurant.dart';
import '../models/osm_restaurant.dart';
import 'location_service.dart';

class GooglePlacesException implements Exception {
  final String message;
  final int? statusCode;

  const GooglePlacesException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class GooglePlacesService {
  static const String _nearbySearchUrl =
      'https://places.googleapis.com/v1/places:searchNearby';
  static const String _textSearchUrl =
      'https://places.googleapis.com/v1/places:searchText';

  // FieldMask incluindo fotos do Google Meu Negócio
  static const String _fieldMask =
      'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos';

  // Cache em memória para evitar chamadas de API repetidas
  static final Map<String, List<GooglePlaceRestaurant>> _cache = {};
  static final Map<String, DateTime> _cacheTimestamps = {};
  static const Duration _cacheDuration = Duration(minutes: 5);

  /// Busca restaurantes próximos usando a Google Places API (New) Nearby Search
  static Future<List<GooglePlaceRestaurant>> searchNearbyRestaurants({
    required double latitude,
    required double longitude,
    double radiusMeters = 3000.0,
    bool forceRefresh = false,
  }) async {
    final apiKey = AppConfig.googleMapsApiKey;
    if (apiKey.isEmpty) {
      throw const GooglePlacesException(
        'Chave da Google Maps Platform não configurada.',
      );
    }

    final cacheKey =
        '${latitude.toStringAsFixed(3)}_${longitude.toStringAsFixed(3)}_${radiusMeters.toInt()}';

    if (!forceRefresh && _cache.containsKey(cacheKey)) {
      final timestamp = _cacheTimestamps[cacheKey];
      if (timestamp != null &&
          DateTime.now().difference(timestamp) < _cacheDuration) {
        debugPrint('GooglePlacesService: Retornando dados em cache para $cacheKey');
        return _cache[cacheKey]!;
      }
    }

    final requestBody = {
      'includedTypes': ['restaurant'],
      'maxResultCount': 20,
      'rankPreference': 'DISTANCE',
      'locationRestriction': {
        'circle': {
          'center': {
            'latitude': latitude,
            'longitude': longitude,
          },
          'radius': radiusMeters,
        },
      },
    };

    try {
      final response = await http
          .post(
            Uri.parse(_nearbySearchUrl),
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': _fieldMask,
            },
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode != 200) {
        String mensagemErro = 'Erro na Places API (HTTP ${response.statusCode})';
        try {
          final erroJson = jsonDecode(response.body) as Map<String, dynamic>;
          final erroInfo = erroJson['error'] as Map<String, dynamic>?;
          if (erroInfo != null && erroInfo['message'] != null) {
            mensagemErro = erroInfo['message'].toString();
          }
        } catch (_) {}

        throw GooglePlacesException(mensagemErro, statusCode: response.statusCode);
      }

      final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      final placesList = (data['places'] as List<dynamic>?) ?? [];

      final List<GooglePlaceRestaurant> restaurants = [];

      for (final item in placesList) {
        if (item is! Map<String, dynamic>) continue;

        final location = item['location'] as Map<String, dynamic>?;
        final placeLat = (location?['latitude'] as num?)?.toDouble() ?? 0.0;
        final placeLng = (location?['longitude'] as num?)?.toDouble() ?? 0.0;

        final distance = LocationService.calculateDistanceMeters(
          latitude,
          longitude,
          placeLat,
          placeLng,
        );

        final restaurant = GooglePlaceRestaurant.fromPlacesNewJson(
          item,
          distance: distance,
        );

        restaurants.add(restaurant);
      }

      restaurants.sort(
        (a, b) => (a.distanceMeters ?? 0).compareTo(b.distanceMeters ?? 0),
      );

      _cache[cacheKey] = restaurants;
      _cacheTimestamps[cacheKey] = DateTime.now();

      return restaurants;
    } catch (e) {
      if (e is GooglePlacesException) rethrow;
      throw GooglePlacesException('Falha de conexão ao buscar restaurantes: $e');
    }
  }

  /// Busca informações e foto oficial do Google Meu Negócio para um restaurante específico
  static Future<Map<String, dynamic>?> fetchGooglePlaceInfo(
    String restaurantName, {
    required double latitude,
    required double longitude,
  }) async {
    final apiKey = AppConfig.googleMapsApiKey;
    if (apiKey.isEmpty) return null;

    final requestBody = {
      'textQuery': restaurantName,
      'languageCode': 'pt-BR',
      'maxResultCount': 1,
      'locationBias': {
        'circle': {
          'center': {
            'latitude': latitude,
            'longitude': longitude,
          },
          'radius': 1000.0,
        },
      },
    };

    try {
      final response = await http
          .post(
            Uri.parse(_textSearchUrl),
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.photos,places.formattedAddress',
            },
            body: jsonEncode(requestBody),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode != 200) return null;

      final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      final places = data['places'] as List<dynamic>?;
      if (places == null || places.isEmpty) return null;

      final place = places[0] as Map<String, dynamic>;
      String? photoUrl;
      final photos = place['photos'] as List<dynamic>?;
      if (photos != null && photos.isNotEmpty) {
        final firstPhoto = photos[0] as Map<String, dynamic>?;
        final photoName = firstPhoto?['name']?.toString();
        if (photoName != null) {
          photoUrl = 'https://places.googleapis.com/v1/$photoName/media?maxWidthPx=800&key=$apiKey';
        }
      }

      return {
        'photoUrl': photoUrl,
        'rating': (place['rating'] as num?)?.toDouble(),
        'reviewsCount': place['userRatingCount'] as int?,
        'address': place['formattedAddress']?.toString(),
      };
    } catch (_) {
      return null;
    }
  }

  /// Enriquece a lista de restaurantes do OpenStreetMap com fotos e notas reais do Google Meu Negócio
  static Future<List<OsmRestaurant>> enrichOsmRestaurants(
    List<OsmRestaurant> osmList, {
    required double userLat,
    required double userLng,
  }) async {
    if (AppConfig.googleMapsApiKey.isEmpty) return osmList;

    // Enriquece os primeiros 10 restaurantes mais próximos em paralelo com timeout de 3s
    final enrichedFutures = osmList.map((rest) async {
      try {
        final info = await fetchGooglePlaceInfo(
          rest.name,
          latitude: rest.lat,
          longitude: rest.lng,
        );

        if (info != null) {
          return rest.copyWith(
            photoUrl: info['photoUrl'] as String?,
            rating: info['rating'] as double? ?? rest.rating,
            reviewsCount: info['reviewsCount'] as int? ?? rest.reviewsCount,
            address: (rest.address == null || rest.address!.isEmpty)
                ? (info['address'] as String?)
                : rest.address,
          );
        }
      } catch (_) {}
      return rest;
    }).toList();

    try {
      final results = await Future.wait(enrichedFutures);
      return results;
    } catch (_) {
      return osmList;
    }
  }

  /// Limpa o cache de buscas
  static void clearCache() {
    _cache.clear();
    _cacheTimestamps.clear();
  }
}
