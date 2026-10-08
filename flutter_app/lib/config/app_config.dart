class AppConfig {
  /// Chave da Google Maps Platform.
  /// Deve ser injetada via linha de comando ou variáveis de ambiente no build:
  /// flutter run --dart-define=GOOGLE_MAPS_API_KEY=sua_chave_aqui
  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );

  /// Verifica se a chave foi configurada
  static bool get hasGoogleMapsKey => googleMapsApiKey.isNotEmpty;
}
