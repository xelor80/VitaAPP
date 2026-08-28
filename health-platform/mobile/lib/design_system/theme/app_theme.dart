import 'package:flutter/material.dart';
import 'tokens.dart';

/// Baut Light-/Dark-ThemeData aus den Design-Tokens (docs/12).
class AppTheme {
  static ThemeData get light => _build(
        brightness: Brightness.light,
        primary: AppColorsLight.primary,
        background: AppColorsLight.background,
        surface: AppColorsLight.surface,
        textPrimary: AppColorsLight.textPrimary,
        textSecondary: AppColorsLight.textSecondary,
        border: AppColorsLight.border,
      );

  static ThemeData get dark => _build(
        brightness: Brightness.dark,
        primary: AppColorsDark.primary,
        background: AppColorsDark.background,
        surface: AppColorsDark.surface,
        textPrimary: AppColorsDark.textPrimary,
        textSecondary: AppColorsDark.textSecondary,
        border: AppColorsDark.border,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color primary,
    required Color background,
    required Color surface,
    required Color textPrimary,
    required Color textSecondary,
    required Color border,
  }) {
    final base = ThemeData(brightness: brightness, useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: brightness,
      ).copyWith(surface: surface),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.card),
          side: BorderSide(color: border),
        ),
        margin: const EdgeInsets.symmetric(vertical: Spacing.s),
      ),
      textTheme: base.textTheme.apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
    );
  }
}
