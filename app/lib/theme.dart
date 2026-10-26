import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Brand colours sampled from the VEN International Logistics logo.
class VenColors {
  static const navy = Color(0xFF17174A);
  static const navyLight = Color(0xFF2A2A63);
  static const lime = Color(0xFFB5CF30);
  static const limeTint = Color(0xFFF4F8E1);
  static const background = Color(0xFFF5F6FA);
  static const surface = Colors.white;
  static const border = Color(0xFFD8DAE8);
  static const muted = Color(0xFF5D5E80);
  static const onNavyMuted = Color(0xFFC9CAE3);
  static const segment = Color(0xFFEEF0F6);
  static const error = Color(0xFFB3261E);
}

ThemeData buildVenTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: VenColors.navy).copyWith(
    primary: VenColors.navy,
    onPrimary: Colors.white,
    secondary: VenColors.lime,
    onSecondary: VenColors.navy,
    surface: VenColors.surface,
    onSurface: VenColors.navy,
    error: VenColors.error,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, scaffoldBackgroundColor: VenColors.background);
  final text = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
    bodyColor: VenColors.navy,
    displayColor: VenColors.navy,
  );
  final radius = BorderRadius.circular(10);

  return base.copyWith(
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: VenColors.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: text.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: VenColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: VenColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: VenColors.navy, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: VenColors.error)),
      hintStyle: const TextStyle(color: VenColors.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: VenColors.lime,
        foregroundColor: VenColors.navy,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: VenColors.navy,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: VenColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: VenColors.navy,
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: VenColors.navy),
  );
}
