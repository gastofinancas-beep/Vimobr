import 'package:geolocator/geolocator.dart';

class LocationServiceException implements Exception {
  final String message;
  const LocationServiceException(this.message);

  @override
  String toString() => message;
}

class LocationServiceDisabledException extends LocationServiceException {
  const LocationServiceDisabledException()
      : super('O serviço de localização (GPS) está desativado no dispositivo.');
}

class LocationPermissionDeniedException extends LocationServiceException {
  const LocationPermissionDeniedException()
      : super('A permissão de localização foi negada.');
}

class LocationPermissionDeniedForeverException extends LocationServiceException {
  const LocationPermissionDeniedForeverException()
      : super('A permissão de localização foi negada permanentemente nas configurações.');
}

class LocationService {
  /// Obtém a localização atual do usuário com verificação e requisição de permissões
  static Future<Position> getCurrentLocation() async {
    // 1. Verificar se o GPS está ativado
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceDisabledException();
    }

    // 2. Verificar permissões
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw const LocationPermissionDeniedException();
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw const LocationPermissionDeniedForeverException();
    }

    // 3. Obter coordenada atual com alta precisão
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 15),
    );
  }

  /// Calcula a distância em metros entre dois pontos geográficos
  static double calculateDistanceMeters(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// Abre as configurações do sistema para o usuário habilitar permissões
  static Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }

  /// Abre as configurações de localização do sistema
  static Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }
}
