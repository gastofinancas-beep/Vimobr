# Garfo — App Mobile Nativo em Flutter (iOS & Android)

Aplicativo oficial **Garfo** desenvolvido em **Flutter / Dart** para **iOS e Android**, replicando toda a experiência da rede social e diário gastronômico estilo Letterboxd, agora com **Mapa OpenStreetMap 100% gratuito e em tempo real via Overpass API**.

---

## 📱 Estrutura do Projeto Flutter

```
flutter_app/
├── pubspec.yaml                 # Dependências (flutter_map, latlong2, geolocator, http, url_launcher)
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml  # Permissões de GPS e queries de mapas externos
├── ios/
│   └── Runner/
│       └── Info.plist           # Permissões de localização para iOS
├── lib/
│   ├── main.dart                # Ponto de entrada do app Flutter
│   ├── theme/
│   │   └── app_theme.dart       # Paleta dark (#0F0D0B) e tipografia DM Sans
│   ├── models/
│   │   ├── osm_restaurant.dart  # Modelo de restaurante retornado pelo OpenStreetMap
│   │   ├── place.dart           # Modelo de Estabelecimento
│   │   ├── review.dart          # Modelo de Avaliação & Diário
│   │   └── user_profile.dart    # Modelo de Usuário
│   ├── services/
│   │   ├── overpass_service.dart # Consulta à Overpass API do OpenStreetMap (raio ~3km)
│   │   └── mock_data.dart       # Dados iniciais e mock service
│   ├── widgets/
│   │   ├── star_rating.dart     # Seletor e exibição de notas em estrelas
│   │   ├── place_card.dart      # Card visual de restaurante/café
│   │   └── review_card.dart     # Card completo com curtidas e comentários
│   └── screens/
│       ├── main_screen.dart     # Navegação inferior por abas
│       ├── explorar_screen.dart # Busca, filtros por categoria e estabelecimentos
│       ├── mapa_screen.dart     # Tela de Mapa com OpenStreetMap, GPS e Overpass API
│       ├── comunidade_screen.dart # Feed social de avaliações (Seguindo / Descobrir)
│       ├── perfil_screen.dart   # Perfil estilo Letterboxd com estatísticas
│       ├── place_detail_screen.dart # Detalhes do local com avaliações
│       └── avaliar_screen.dart  # Modal de registro no diário e avaliação
```

---

## 🗺️ Mapa com OpenStreetMap & Overpass API (Sem Chaves Pagas)

A tela `mapa_screen.dart` foi implementada com:
- **`flutter_map` + `latlong2`**: Renderização de mapa OpenStreetMap (tiles CartoDB Dark Matter com atribuição legal).
- **`geolocator`**: Detecção automática de GPS, centralização no usuário e cálculo de distância.
- **`Overpass API`**: Busca de nós e vias com tag `amenity=restaurant` num raio de aproximadamente 3 km (`around:3000`).
- **`url_launcher`**: Botão direto para traçar rota e abrir o restaurante no app nativo de mapas (Google Maps / Apple Maps / Waze).
- **Tratamento de Exceções**: Permissão negada, permissão negada permanente com link para Ajustes, GPS desativado e estado vazio quando não há restaurantes.
- **Cache Inteligente**: Evita chamadas repetidas à API quando o usuário apenas move o mapa levemente.

---

## 🚀 Como Executar e Testar

### 1. Pré-requisitos
- [Flutter SDK](https://flutter.dev/docs/get-started/install) instalado (v3.2.0 ou superior).
- Emulador Android ou Simulador iOS com GPS habilitado.

### 2. Instalar as dependências
```bash
cd flutter_app
flutter pub add flutter_map latlong2 geolocator http url_launcher
flutter pub get
```

### 3. Rodar no Simulador / Emulador
```bash
flutter run
```

*Dica para teste de GPS no simulador:*
- **iOS Simulator:** Menu `Features` > `Location` > Selecione `Apple Store` ou `Custom Location...`
- **Android Emulator:** Menu `...` (Extended Controls) > `Location` > Defina coordenadas e clique em `Set Location`.
