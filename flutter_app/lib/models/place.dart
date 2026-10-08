class Place {
  final String id;
  final String name;
  final String category;
  final String address;
  final String? neighborhood;
  final String? city;
  final double rating;
  final int reviewsCount;
  final String priceLevel;
  final String photoUrl;
  final double lat;
  final double lng;
  final double? distanceKm;
  final List<String> tags;
  final String? openingHours;

  const Place({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    this.neighborhood,
    this.city,
    required this.rating,
    required this.reviewsCount,
    this.priceLevel = '$$',
    required this.photoUrl,
    required this.lat,
    required this.lng,
    this.distanceKm,
    this.tags = const [],
    this.openingHours,
  });

  Place copyWith({
    String? id,
    String? name,
    String? category,
    String? address,
    String? neighborhood,
    String? city,
    double? rating,
    int? reviewsCount,
    String? priceLevel,
    String? photoUrl,
    double? lat,
    double? lng,
    double? distanceKm,
    List<String>? tags,
    String? openingHours,
  }) {
    return Place(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      address: address ?? this.address,
      neighborhood: neighborhood ?? this.neighborhood,
      city: city ?? this.city,
      rating: rating ?? this.rating,
      reviewsCount: reviewsCount ?? this.reviewsCount,
      priceLevel: priceLevel ?? this.priceLevel,
      photoUrl: photoUrl ?? this.photoUrl,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      distanceKm: distanceKm ?? this.distanceKm,
      tags: tags ?? this.tags,
      openingHours: openingHours ?? this.openingHours,
    );
  }
}
