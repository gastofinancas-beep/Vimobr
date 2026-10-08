import '../models/review.dart';
import '../services/mock_data.dart';

abstract class ReviewRepository {
  Future<List<Review>> getReviews({String? placeId, String? userId});
  Future<List<Review>> getFollowingFeed();
  Future<List<Review>> getDiscoverFeed();
  Future<void> createReview(Review review);
  Future<bool> toggleLike(String reviewId);
  Future<bool> isLiked(String reviewId);
}

class MockReviewRepository implements ReviewRepository {
  final List<Review> _reviews = List.from(MockData.reviews);
  final Set<String> _likedReviewIds = {'r1'};

  static final MockReviewRepository instance = MockReviewRepository._internal();
  MockReviewRepository._internal();

  @override
  Future<List<Review>> getReviews({String? placeId, String? userId}) async {
    await Future.delayed(const Duration(milliseconds: 100));
    var results = List<Review>.from(_reviews);

    if (placeId != null) {
      results = results.where((r) => r.placeId == placeId).toList();
    }
    if (userId != null) {
      results = results.where((r) => r.userId == userId).toList();
    }

    results.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return results;
  }

  @override
  Future<List<Review>> getFollowingFeed() async {
    await Future.delayed(const Duration(milliseconds: 150));
    return List<Review>.from(_reviews)..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  @override
  Future<List<Review>> getDiscoverFeed() async {
    await Future.delayed(const Duration(milliseconds: 150));
    return List<Review>.from(_reviews)..sort((a, b) => b.likesCount.compareTo(a.likesCount));
  }

  @override
  Future<void> createReview(Review review) async {
    _reviews.insert(0, review);
  }

  @override
  Future<bool> toggleLike(String reviewId) async {
    final idx = _reviews.indexWhere((r) => r.id == reviewId);
    final currentlyLiked = _likedReviewIds.contains(reviewId);

    if (currentlyLiked) {
      _likedReviewIds.remove(reviewId);
      if (idx >= 0) {
        _reviews[idx] = _reviews[idx].copyWith(
          likesCount: (_reviews[idx].likesCount - 1).clamp(0, 99999),
          hasLiked: false,
        );
      }
      return false;
    } else {
      _likedReviewIds.add(reviewId);
      if (idx >= 0) {
        _reviews[idx] = _reviews[idx].copyWith(
          likesCount: _reviews[idx].likesCount + 1,
          hasLiked: true,
        );
      }
      return true;
    }
  }

  @override
  Future<bool> isLiked(String reviewId) async {
    return _likedReviewIds.contains(reviewId);
  }
}
