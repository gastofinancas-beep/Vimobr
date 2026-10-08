class RestaurantList {
  final String id;
  final String userId;
  final String name;
  final String description;
  final String coverImage;
  final List<String> placeIds;
  final bool isPublic;
  final DateTime createdAt;

  const RestaurantList({
    required this.id,
    required this.userId,
    required this.name,
    required this.description,
    required this.coverImage,
    required this.placeIds,
    this.isPublic = true,
    required this.createdAt,
  });

  RestaurantList copyWith({
    String? id,
    String? userId,
    String? name,
    String? description,
    String? coverImage,
    List<String>? placeIds,
    bool? isPublic,
    DateTime? createdAt,
  }) {
    return RestaurantList(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      description: description ?? this.description,
      coverImage: coverImage ?? this.coverImage,
      placeIds: placeIds ?? this.placeIds,
      isPublic: isPublic ?? this.isPublic,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
