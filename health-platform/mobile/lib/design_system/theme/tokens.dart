import 'package:flutter/material.dart';

/// Design-Tokens (docs/12). Ruhig, hochwertig, semantische Statusfarben.
/// Light + Dark als vollständige Paletten (kein Einzelfarben-Hardcoding).
class AppColorsLight {
  static const primary = Color(0xFF2E7D6B); // ruhiges Health-Grün
  static const background = Color(0xFFF6F8F7);
  static const surface = Color(0xFFFFFFFF);
  static const textPrimary = Color(0xFF17211E);
  static const textSecondary = Color(0xFF5B6B66);
  static const border = Color(0xFFE2E8E5);

  // Semantische Statusfarben (dezent)
  static const success = Color(0xFF3E9E7A);
  static const info = Color(0xFF3B82A6);
  static const attention = Color(0xFFC98A2B);
  static const warning = Color(0xFFB4544B);
}

class AppColorsDark {
  static const primary = Color(0xFF5FBFA6);
  static const background = Color(0xFF0F1513);
  static const surface = Color(0xFF171F1C);
  static const textPrimary = Color(0xFFECF1EF);
  static const textSecondary = Color(0xFFA3B2AD);
  static const border = Color(0xFF283330);

  static const success = Color(0xFF5FBF97);
  static const info = Color(0xFF6BB2D1);
  static const attention = Color(0xFFE0AE63);
  static const warning = Color(0xFFD98078);
}

/// Abstände (4/8-Skala).
class Spacing {
  static const xs = 4.0;
  static const s = 8.0;
  static const m = 16.0;
  static const l = 24.0;
  static const xl = 32.0;
}

/// Weiche Rundungen.
class Radii {
  static const card = 20.0;
  static const chip = 12.0;
  static const pill = 999.0;
}
