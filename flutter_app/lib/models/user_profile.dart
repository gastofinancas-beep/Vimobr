class UserProfile {
  final String uid;
  final String displayName;
  final String handle;
  final String photoUrl;
  final String bio;
  final String homeCityKey;
  final String homeCityName;
  final int followersCount;
  final int followingCount;

  const UserProfile({
    required this.uid,
    required this.displayName,
    required this.handle,
    required this.photoUrl,
    required this.bio,
    this.homeCityKey = 'sao-paulo-sp',
    this.homeCityName = 'São Paulo - SP',
    this.followersCount = 0,
    this.followingCount = 0,
  });
}
