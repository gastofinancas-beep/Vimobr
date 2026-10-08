import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'screens/main_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR', null);

  // Barra de status translúcida e tema escuro
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: VimoColors.surface,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const VimoApp());
}

class VimoApp extends StatelessWidget {
  const VimoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VIMO — Diário Gastronômico',
      debugShowCheckedModeBanner: false,
      theme: VimoTheme.darkTheme,
      home: const MainScreen(),
    );
  }
}
