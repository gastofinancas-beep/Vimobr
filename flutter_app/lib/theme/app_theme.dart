import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta sofisticada, editorial e minimalista do VIMO
class VimoColors {
  // Light Mode (Padrão Principal)
  static const Color background = Color(0xFFFAF9F6);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSecondary = Color(0xFFF3F1EC);
  static const Color border = Color(0xFFE8E5DE);
  static const Color textPrimary = Color(0xFF171717);
  static const Color textSecondary = Color(0xFF737373);
  static const Color accent = Color(0xFFB88A52);
  static const Color accentSoft = Color(0xFFF3EBDD);
  static const Color success = Color(0xFF4A8B6C);
  static const Color danger = Color(0xFFC75D5D);
  static const Color heart = Color(0xFFC75D5D);

  // Aliases de compatibilidade
  static const Color bg = background;
  static const Color s1 = surface;
  static const Color s2 = surfaceSecondary;
  static const Color line = border;
  static const Color ink = textPrimary;
  static const Color muted = textSecondary;
  static const Color green = success;
}

typedef GarfoColors = VimoColors;

class VimoTheme {
  static ThemeData get lightTheme {
    final textTheme = GoogleFonts.dmSansTextTheme(
      ThemeData.light().textTheme.apply(
        bodyColor: VimoColors.textPrimary,
        displayColor: VimoColors.textPrimary,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: VimoColors.background,
      primaryColor: VimoColors.accent,
      colorScheme: const ColorScheme.light(
        primary: VimoColors.accent,
        secondary: VimoColors.accent,
        surface: VimoColors.surface,
        onSurface: VimoColors.textPrimary,
        outline: VimoColors.border,
        error: VimoColors.danger,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: VimoColors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: VimoColors.textPrimary),
        titleTextStyle: GoogleFonts.dmSans(
          color: VimoColors.textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: VimoColors.surface,
        selectedItemColor: VimoColors.textPrimary,
        unselectedItemColor: VimoColors.textSecondary,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(
        color: VimoColors.border,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardTheme(
        color: VimoColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: VimoColors.border, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: VimoColors.surfaceSecondary,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: GoogleFonts.dmSans(color: VimoColors.textSecondary, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: VimoColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: VimoColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: VimoColors.accent, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: VimoColors.textPrimary,
          foregroundColor: VimoColors.surface,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.dmSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.1,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: VimoColors.textPrimary,
          side: const BorderSide(color: VimoColors.border),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.dmSans(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textTheme: textTheme,
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF111111),
      primaryColor: const Color(0xFFC49A6C),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFC49A6C),
        surface: Color(0xFF181818),
        onSurface: Color(0xFFF5F5F5),
        outline: Color(0xFF292929),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF111111),
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: Color(0xFFF5F5F5)),
        titleTextStyle: TextStyle(color: Color(0xFFF5F5F5), fontSize: 18, fontWeight: FontWeight.w700),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF181818),
        selectedItemColor: Color(0xFFF5F5F5),
        unselectedItemColor: Color(0xFFA0A0A0),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(color: Color(0xFF292929)),
    );
  }
}

typedef GarfoTheme = VimoTheme;
