import '../config/app_config.dart';

class GooglePlaceRestaurant {
  final String id;
  final String name;
  final String? formattedAddress;
  final double lat;
  final double lng;
  final double? rating;
  final int? userRatingCount;
  final double? distanceMeters;
  final String? photoUrl;

  const GooglePlaceRestaurant({
    required this.id,
    required this.name,
    this.formattedAddress,
    required this.lat,
    required this.lng,
    this.rating,
    this.userRatingCount,
    this.distanceMeters,
    this.photoUrl,
  });

  /// Distância aproximada formatada (ex: '350 m' ou '1,8 km')
  String get formattedDistance {
    if (distanceMeters == null) return '';
    if (distanceMeters! < 1000) {
      return '${distanceMeters!.round()} m';
    } else {
      final km = (distanceMeters! / 1000).toStringAsFixed(1).replaceAll('.', ',');
      return '$km km';
    }
  }

  /// Coordenadas formatadas (ex: '-23.5616, -46.6823')
  String get formattedCoordinates {
    return '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
  }

  /// Constrói a partir do formato retornado pela Google Places API (New)
  factory GooglePlaceRestaurant.fromPlacesNewJson(
    Map<String, dynamic> json, {
    double? distance,
  }) {
    final id = json['id']?.toString() ?? '';
    final displayName = json['displayName'] as Map<String, dynamic>?;
    final name = displayName?['text']?.toString() ?? 'Restaurante';
    final formattedAddress = json['formattedAddress']?.toString();

    final location = json['location'] as Map<String, dynamic>?;
    final lat = (location?['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (location?['longitude'] as num?)?.toDouble() ?? 0.0;

    final rating = (json['rating'] as num?)?.toDouble();
    final userRatingCount = json['userRatingCount'] as int?;

    // Extrair foto do Google Meu Negócio / Places
    String? photoUrl;
    final photos = json['photos'] as List<dynamic>?;
    if (photos != null && photos.isNotEmpty) {
      final firstPhoto = photos[0] as Map<String, dynamic>?;
      final photoName = firstPhoto?['name']?.toString();
      if (photoName != null && AppConfig.googleMapsApiKey.isNotEmpty) {
        photoUrl =
            'https://places.googleapis.com/v1/$photoName/media?maxWidthPx=800&key=${AppConfig.googleMapsApiKey}';
      }
    }

    return GooglePlaceRestaurant(
      id: id,
      name: name,
      formattedAddress: formattedAddress,
      lat: lat,
      lng: lng,
      rating: rating,
      userRatingCount: userRatingCount,
      distanceMeters: distance,
      photoUrl: photoUrl,
    );
  }
}
