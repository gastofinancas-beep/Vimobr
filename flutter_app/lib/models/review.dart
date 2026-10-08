class Review {
  final String id;
  final String placeId;
  final String placeName;
  final String placeCategory;
  final String? placePhotoUrl;
  final String userId;
  final String userName;
  final String userHandle;
  final String? userAvatarUrl;
  final double rating;
  final String text;
  final List<String> dishesOrdered;
  final String? favoriteDish;
  final List<String> companionTags;
  final int likesCount;
  final int commentsCount;
  final bool hasLiked;
  final DateTime createdAt;
  final DateTime? visitedAt;
  final DateTime? updatedAt;
  final List<String> photos;
  final bool isPublic;
  final int savedCount;
  final String? occasion;

  const Review({
    required this.id,
    required this.placeId,
    required this.placeName,
    required this.placeCategory,
    this.placePhotoUrl,
    required this.userId,
    required this.userName,
    required this.userHandle,
    this.userAvatarUrl,
    required this.rating,
    required this.text,
    this.dishesOrdered = const [],
    this.favoriteDish,
    this.companionTags = const [],
    this.likesCount = 0,
    this.commentsCount = 0,
    this.hasLiked = false,
    required this.createdAt,
    this.visitedAt,
    this.updatedAt,
    this.photos = const [],
    this.isPublic = true,
    this.savedCount = 0,
    this.occasion,
  });

  Review copyWith({
    String? id,
    String? placeId,
    String? placeName,
    String? placeCategory,
    String? placePhotoUrl,
    String? userId,
    String? userName,
    String? userHandle,
    String? userAvatarUrl,
    double? rating,
    String? text,
    List<String>? dishesOrdered,
    String? favoriteDish,
    List<String>? companionTags,
    int? likesCount,
    int? commentsCount,
    bool? hasLiked,
    DateTime? createdAt,
    DateTime? visitedAt,
    DateTime? updatedAt,
    List<String>? photos,
    bool? isPublic,
    int? savedCount,
    String? occasion,
  }) {
    return Review(
      id: id ?? this.id,
      placeId: placeId ?? this.placeId,
      placeName: placeName ?? this.placeName,
      placeCategory: placeCategory ?? this.placeCategory,
      placePhotoUrl: placePhotoUrl ?? this.placePhotoUrl,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userHandle: userHandle ?? this.userHandle,
      userAvatarUrl: userAvatarUrl ?? this.userAvatarUrl,
      rating: rating ?? this.rating,
      text: text ?? this.text,
      dishesOrdered: dishesOrdered ?? this.dishesOrdered,
      favoriteDish: favoriteDish ?? this.favoriteDish,
      companionTags: companionTags ?? this.companionTags,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      hasLiked: hasLiked ?? this.hasLiked,
      createdAt: createdAt ?? this.createdAt,
      visitedAt: visitedAt ?? this.visitedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      photos: photos ?? this.photos,
      isPublic: isPublic ?? this.isPublic,
      savedCount: savedCount ?? this.savedCount,
      occasion: occasion ?? this.occasion,
    );
  }
}
