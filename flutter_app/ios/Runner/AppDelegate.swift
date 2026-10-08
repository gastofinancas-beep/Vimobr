import UIKit
import Flutter
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configuração do Google Maps SDK para iOS
    GMSServices.provideAPIKey("AIzaSyCn-3vAXFLE3s-XnGmwmjBmXbUiMul2Uww")
    GMSServices.addInternalUsageAttributionID("gmp_mcp_codeassist_v1_aistudio")

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
