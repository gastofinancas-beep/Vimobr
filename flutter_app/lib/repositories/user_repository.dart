import '../models/user_profile.dart';
import '../services/mock_data.dart';

abstract class UserRepository {
  Future<UserProfile> getCurrentUser();
  Future<UserProfile?> getUserById(String uid);
  Future<void> updateProfile(UserProfile profile);
  Future<bool> toggleFollow(String targetUid);
  Future<bool> isFollowing(String targetUid);
}

class MockUserRepository implements UserRepository {
  static final MockUserRepository instance = MockUserRepository._internal();
  MockUserRepository._internal();

  UserProfile _currentUser = MockData.currentUser;
  final Set<String> _following = {'user-1', 'user-2'};

  @override
  Future<UserProfile> getCurrentUser() async {
    return _currentUser;
  }

  @override
  Future<UserProfile?> getUserById(String uid) async {
    if (uid == _currentUser.uid) return _currentUser;
    return UserProfile(
      uid: uid,
      displayName: 'Camila Rossi',
      handle: '@camilagourmet',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      bio: 'Crítica independente e apaixonada por alta gastronomia.',
      homeCityName: 'São Paulo - SP',
      followersCount: 120,
      followingCount: 88,
    );
  }

  @override
  Future<void> updateProfile(UserProfile profile) async {
    _currentUser = profile;
  }

  @override
  Future<bool> toggleFollow(String targetUid) async {
    if (_following.contains(targetUid)) {
      _following.remove(targetUid);
      return false;
    } else {
      _following.add(targetUid);
      return true;
    }
  }

  @override
  Future<bool> isFollowing(String targetUid) async {
    return _following.contains(targetUid);
  }
}
