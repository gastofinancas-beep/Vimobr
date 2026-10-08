import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

import '../models/osm_restaurant.dart';
import '../services/location_service.dart';
import '../services/overpass_service.dart';
import '../services/google_places_service.dart';
import '../theme/app_theme.dart';

enum MapLoadState {
  initial,
  loadingLocation,
  loadingRestaurants,
  success,
  empty,
  gpsDisabled,
  permissionDenied,
  permissionDeniedForever,
  apiError,
  networkError,
}

class MapaScreen extends StatefulWidget {
  const MapaScreen({super.key});

  @override
  State<MapaScreen> createState() => _MapaScreenState();
}

class _MapaScreenState extends State<MapaScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();

  MapLoadState _state = MapLoadState.initial;
  String _errorMessage = '';

  LatLng? _userLocation;
  List<OsmRestaurant> _restaurants = [];
  OsmRestaurant? _selectedRestaurant;

  // Raio de busca de aproximadamente 3 km
  static const int _searchRadiusMeters = 3000;

  // Coordenadas padrão de fallback (São Paulo)
  static const LatLng _defaultLocation = LatLng(-23.561684, -46.682371);

  @override
  void initState() {
    super.initState();
    _startLocationAndRestaurantsFlow();
  }

  /// Inicia o ciclo completo: solicita permissões, obtém posição e busca restaurantes
  Future<void> _startLocationAndRestaurantsFlow({bool forceRefresh = false}) async {
    setState(() {
      _state = MapLoadState.loadingLocation;
      _errorMessage = '';
    });

    try {
      // 1. Obter localização atual do usuário com geolocator
      final position = await LocationService.getCurrentLocation();
      final userCoords = LatLng(position.latitude, position.longitude);

      if (!mounted) return;
      setState(() {
        _userLocation = userCoords;
        _state = MapLoadState.loadingRestaurants;
      });

      // 2. Centralizar mapa automaticamente na localização do usuário
      _animatedMove(userCoords, 15.0);

      // 3. Buscar restaurantes próximos no OpenStreetMap via Overpass API (3 km)
      final osmList = await OverpassService.fetchNearbyRestaurants(
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        radiusMeters: _searchRadiusMeters,
        forceRefresh: forceRefresh,
      );

      if (!mounted) return;

      if (osmList.isEmpty) {
        setState(() {
          _restaurants = [];
          _state = MapLoadState.empty;
        });
        return;
      }

      setState(() {
        _restaurants = osmList;
        _state = MapLoadState.success;
      });

      // 4. Enriquecer em segundo plano com fotos e dados do Google Meu Negócio
      _enrichRestaurantsWithGoogleMeuNegocio(osmList, userCoords);
    } on LocationServiceDisabledException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = MapLoadState.gpsDisabled;
        _errorMessage = e.message;
      });
    } on LocationPermissionDeniedException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = MapLoadState.permissionDenied;
        _errorMessage = e.message;
      });
    } on LocationPermissionDeniedForeverException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = MapLoadState.permissionDeniedForever;
        _errorMessage = e.message;
      });
    } on OverpassException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = MapLoadState.apiError;
        _errorMessage = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = MapLoadState.networkError;
        _errorMessage = 'Falha ao carregar o mapa: $e';
      });
    }
  }

  /// Busca fotos e avaliações oficiais do Google Meu Negócio de forma assíncrona
  Future<void> _enrichRestaurantsWithGoogleMeuNegocio(
    List<OsmRestaurant> baseList,
    LatLng userCoords,
  ) async {
    try {
      final enriched = await GooglePlacesService.enrichOsmRestaurants(
        baseList,
        userLat: userCoords.latitude,
        userLng: userCoords.longitude,
      );

      if (mounted) {
        setState(() {
          _restaurants = enriched;
          // Atualiza o restaurante selecionado caso ele tenha recebido nova imagem
          if (_selectedRestaurant != null) {
            final match = enriched.firstWhere(
              (r) => r.id == _selectedRestaurant!.id,
              orElse: () => _selectedRestaurant!,
            );
            _selectedRestaurant = match;
          }
        });
      }
    } catch (_) {
      // Falhas no enriquecimento não afetam a navegação no mapa
    }
  }

  /// Animação de movimento suave no mapa
  void _animatedMove(LatLng destLocation, double destZoom) {
    try {
      _mapController.move(destLocation, destZoom);
    } catch (_) {}
  }

  /// Abre a localização do restaurante no aplicativo de mapas do smartphone
  Future<void> _openInMapsApp(OsmRestaurant restaurant) async {
    final lat = restaurant.lat;
    final lng = restaurant.lng;
    final query = Uri.encodeComponent(restaurant.name);

    // URI universal para abrir no Google Maps / Apple Maps nativo
    final googleMapsUrl = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
    );
    final geoUrl = Uri.parse('geo:$lat,$lng?q=$lat,$lng($query)');

    try {
      if (await canLaunchUrl(geoUrl)) {
        await launchUrl(geoUrl, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível abrir o aplicativo de mapas.'),
            backgroundColor: GarfoColors.surface,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao abrir mapas: $e'),
          backgroundColor: GarfoColors.surface,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final initialCenter = _userLocation ?? _defaultLocation;

    return Scaffold(
      backgroundColor: GarfoColors.background,
      body: Stack(
        children: [
          // 1. MAPA OPENSTREETMAP COM FLUTTER_MAP
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: initialCenter,
              initialZoom: 15.0,
              minZoom: 4.0,
              maxZoom: 19.0,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all,
              ),
              onTap: (_, __) {
                if (_selectedRestaurant != null) {
                  setState(() => _selectedRestaurant = null);
                }
              },
            ),
            children: [
              // Camada de Tiles do OpenStreetMap
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.garfo.app',
                maxZoom: 19,
              ),

              // Atribuição Obrigatória ao OpenStreetMap
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution(
                    '© OpenStreetMap contributors',
                    prependCopyright: false,
                  ),
                ],
              ),

              // Camada de Marcadores
              MarkerLayer(
                markers: [
                  // Marcador de Localização do Usuário
                  if (_userLocation != null)
                    Marker(
                      point: _userLocation!,
                      width: 44,
                      height: 44,
                      child: _buildUserLocationMarker(),
                    ),

                  // Marcadores dos Restaurantes Próximos
                  ..._restaurants.map((restaurant) {
                    final isSelected = _selectedRestaurant?.id == restaurant.id;
                    return Marker(
                      point: LatLng(restaurant.lat, restaurant.lng),
                      width: isSelected ? 50 : 42,
                      height: isSelected ? 50 : 42,
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedRestaurant = restaurant);
                          _animatedMove(
                            LatLng(restaurant.lat, restaurant.lng),
                            16.0,
                          );
                        },
                        child: _buildRestaurantMarker(restaurant, isSelected),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // 2. HEADER SUPERIOR COM BARRA DE STATUS E TÍTULO
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: GarfoColors.surface.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: GarfoColors.line),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.mapPin, color: GarfoColors.accent, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          _restaurants.isEmpty
                              ? 'Restaurantes (Raio 3 km)'
                              : '${_restaurants.length} Restaurantes Próximos',
                          style: const TextStyle(
                            color: GarfoColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Botão de Recarregar
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _startLocationAndRestaurantsFlow(forceRefresh: true),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: GarfoColors.surface.withOpacity(0.92),
                          shape: BoxShape.circle,
                          border: Border.all(color: GarfoColors.line),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          LucideIcons.refreshCw,
                          color: GarfoColors.textPrimary,
                          size: 18,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. BOTÃO "MINHA LOCALIZAÇÃO" (FAB FLUTUANTE)
          Positioned(
            right: 16,
            bottom: _selectedRestaurant != null ? 240 : 32,
            child: FloatingActionButton(
              heroTag: 'btn_minha_localizacao',
              backgroundColor: GarfoColors.surface,
              foregroundColor: GarfoColors.accent,
              elevation: 6,
              shape: const CircleBorder(
                side: BorderSide(color: GarfoColors.line, width: 1.5),
              ),
              onPressed: () {
                if (_userLocation != null) {
                  _animatedMove(_userLocation!, 15.5);
                } else {
                  _startLocationAndRestaurantsFlow();
                }
              },
              child: const Icon(LucideIcons.crosshair, size: 22),
            ),
          ),

          // 4. INDICADOR DE CARREGAMENTO FLUTUANTE
          if (_state == MapLoadState.loadingLocation ||
              _state == MapLoadState.loadingRestaurants)
            Positioned(
              top: 80,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  decoration: BoxDecoration(
                    color: GarfoColors.surface.withOpacity(0.95),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: GarfoColors.accent.withOpacity(0.4)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(GarfoColors.accent),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _state == MapLoadState.loadingLocation
                            ? 'Obtendo sua localização...'
                            : 'Buscando restaurantes (OpenStreetMap)...',
                        style: const TextStyle(
                          color: GarfoColors.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 5. MENSAGENS DE ERRO E ESTADOS DE PERMISSÃO / GPS
          if (_state == MapLoadState.gpsDisabled ||
              _state == MapLoadState.permissionDenied ||
              _state == MapLoadState.permissionDeniedForever ||
              _state == MapLoadState.apiError ||
              _state == MapLoadState.networkError ||
              _state == MapLoadState.empty)
            Positioned(
              top: 80,
              left: 16,
              right: 16,
              child: _buildErrorBanner(),
            ),

          // 6. CARD DO RESTAURANTE SELECIONADO COM FOTO DO GOOGLE MEU NEGÓCIO
          if (_selectedRestaurant != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: _buildRestaurantCard(_selectedRestaurant!),
            ),
        ],
      ),
    );
  }

  /// Marcador azul nativo para localização do usuário com anel pulsante
  Widget _buildUserLocationMarker() {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF007AFF).withOpacity(0.2),
          ),
        ),
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF007AFF),
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF007AFF).withOpacity(0.6),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Marcador personalizado de restaurante com ícone gastronômico
  Widget _buildRestaurantMarker(OsmRestaurant restaurant, bool isSelected) {
    final emoji = _getRestaurantEmoji(restaurant);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: isSelected ? GarfoColors.accent : GarfoColors.surface,
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? Colors.white : GarfoColors.line,
          width: isSelected ? 2.5 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: isSelected
                ? GarfoColors.accent.withOpacity(0.4)
                : Colors.black.withOpacity(0.3),
            blurRadius: isSelected ? 12 : 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          emoji,
          style: TextStyle(fontSize: isSelected ? 22 : 18),
        ),
      ),
    );
  }

  String _getRestaurantEmoji(OsmRestaurant r) {
    final n = ('${r.name} ${r.cuisine}').toLowerCase();
    if (n.contains('pizza')) return '🍕';
    if (n.contains('burger') || n.contains('hamburguer')) return '🍔';
    if (n.contains('sushi') || n.contains('japones')) return '🍣';
    if (n.contains('cafe') || n.contains('café') || n.contains('coffee')) return '☕';
    if (n.contains('padaria') || n.contains('pao') || n.contains('pão')) return '🥐';
    if (n.contains('bar') || n.contains('pub') || n.contains('chope')) return '🍸';
    return '🍽️';
  }

  /// Card detalhado do restaurante ao tocar no marcador
  Widget _buildRestaurantCard(OsmRestaurant restaurant) {
    return Container(
      decoration: BoxDecoration(
        color: GarfoColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: GarfoColors.line),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Foto oficial do Google Meu Negócio / Places (com fallback gastronômico)
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 78,
                  height: 78,
                  child: CachedNetworkImage(
                    imageUrl: restaurant.displayPhotoUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: GarfoColors.background,
                      child: const Center(
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(GarfoColors.accent),
                          ),
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: GarfoColors.background,
                      child: const Icon(LucideIcons.utensils, color: GarfoColors.accent),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // Informações do Restaurante
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            restaurant.name,
                            style: const TextStyle(
                              color: GarfoColors.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(LucideIcons.x, size: 18, color: GarfoColors.textMuted),
                          onPressed: () => setState(() => _selectedRestaurant = null),
                        ),
                      ],
                    ),

                    const SizedBox(height: 4),

                    // Endereço (quando disponível)
                    if (restaurant.address != null && restaurant.address!.isNotEmpty)
                      Row(
                        children: [
                          const Icon(LucideIcons.mapPin, size: 12, color: GarfoColors.textMuted),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              restaurant.address!,
                              style: const TextStyle(
                                color: GarfoColors.textMuted,
                                fontSize: 11,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),

                    const SizedBox(height: 6),

                    // Distância aproximada e Avaliação
                    Row(
                      children: [
                        if (restaurant.distanceMeters != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: GarfoColors.accent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              restaurant.formattedDistance,
                              style: const TextStyle(
                                color: GarfoColors.accent,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),

                        const SizedBox(width: 8),

                        if (restaurant.rating != null)
                          Row(
                            children: [
                              const Icon(LucideIcons.star, color: GarfoColors.accent, size: 13),
                              const SizedBox(width: 3),
                              Text(
                                restaurant.rating!.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: GarfoColors.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                              if (restaurant.reviewsCount != null)
                                Text(
                                  ' (${restaurant.reviewsCount})',
                                  style: const TextStyle(
                                    color: GarfoColors.textMuted,
                                    fontSize: 10,
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Botão para abrir localização no aplicativo de mapas do smartphone
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: GarfoColors.accent,
                foregroundColor: GarfoColors.background,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () => _openInMapsApp(restaurant),
              icon: const Icon(LucideIcons.navigation, size: 16),
              label: const Text(
                'Abrir no aplicativo de mapas',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Banner com tratamento de erros, negação de permissão e GPS desativado
  Widget _buildErrorBanner() {
    IconData icon;
    String title;
    String description;
    String buttonText;
    VoidCallback onAction;

    switch (_state) {
      case MapLoadState.gpsDisabled:
        icon = LucideIcons.mapPinOff;
        title = 'GPS Desativado';
        description = 'Ative a localização do aparelho para encontrar restaurantes ao seu redor.';
        buttonText = 'Ativar GPS';
        onAction = () => LocationService.openLocationSettings();
        break;

      case MapLoadState.permissionDenied:
        icon = LucideIcons.shieldAlert;
        title = 'Permissão Negada';
        description = 'O aplicativo precisa da sua permissão de localização para o mapa.';
        buttonText = 'Conceder Permissão';
        onAction = () => _startLocationAndRestaurantsFlow();
        break;

      case MapLoadState.permissionDeniedForever:
        icon = LucideIcons.lock;
        title = 'Permissão Bloqueada';
        description = 'Acesse as configurações do seu celular para liberar a localização.';
        buttonText = 'Abrir Configurações';
        onAction = () => LocationService.openAppSettings();
        break;

      case MapLoadState.empty:
        icon = LucideIcons.utensilsCrossed;
        title = 'Nenhum Restaurante Localizado';
        description = 'Não encontramos estabelecimentos cadastrados no raio de 3 km.';
        buttonText = 'Tentar Novamente';
        onAction = () => _startLocationAndRestaurantsFlow(forceRefresh: true);
        break;

      default:
        icon = LucideIcons.alertTriangle;
        title = 'Falha de Conexão';
        description = _errorMessage.isNotEmpty
            ? _errorMessage
            : 'Ocorreu um erro ao consultar os restaurantes. Verifique sua conexão.';
        buttonText = 'Tentar Novamente';
        onAction = () => _startLocationAndRestaurantsFlow(forceRefresh: true);
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GarfoColors.surface.withOpacity(0.96),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: GarfoColors.line),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: GarfoColors.accent, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: GarfoColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: const TextStyle(
                        color: GarfoColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 36,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: GarfoColors.accent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: onAction,
              child: Text(
                buttonText,
                style: const TextStyle(
                  color: GarfoColors.accent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
