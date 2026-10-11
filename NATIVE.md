# Build nativo — iOS e Android

## Pré-requisitos

- **iOS:** Mac com Xcode 15+ e CocoaPods instalados (`sudo gem install cocoapods`)
- **Android:** Android Studio instalado e Android SDK configurado

## Primeira vez (adicionar plataformas)

```bash
npm run build              # gera o /dist
npx cap add ios            # cria pasta ios/
npx cap add android        # cria pasta android/
npm run cap:assets         # gera ícones e splash em todos os tamanhos
npx cap sync               # copia o dist para as pastas nativas
```

## Abrir no Xcode / Android Studio

```bash
# iOS
npm run cap:ios       # faz build + sync + abre Xcode

# Android
npm run cap:android   # faz build + sync + abre Android Studio
```

## Publicar na App Store (iOS)

1. No Xcode: selecione o target **Vimo** → **Signing & Capabilities**
2. Informe seu Apple Developer Team e Bundle ID `app.vimo.gastro`
3. Product → Archive → Distribute App → App Store Connect

## Publicar no Google Play (Android)

1. No Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle
2. Suba o `.aab` no Google Play Console em **Produção**

## Atualizar após mudanças no código web

```bash
npm run build && npx cap sync
```
Não é necessário reabrir o Xcode/Android Studio — só fazer novo build/archive.

## Permissões já configuradas

O Capacitor já inclui permissões de câmera, galeria e notificações push via os plugins
declarados em `capacitor.config.ts`. Para localização (aba Mapa) será necessário adicionar
`@capacitor/geolocation` e as strings de permissão no `Info.plist` / `AndroidManifest.xml`.

## App ID

`app.vimo.gastro` — registrar no Apple Developer Portal e no Google Play Console com este ID.
