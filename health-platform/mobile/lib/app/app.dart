import 'package:flutter/material.dart';
import '../design_system/theme/app_theme.dart';
import 'home_shell.dart';

/// Wurzel-Widget der VitaGuide-App. Theme systemgesteuert (Light/Dark).
class VitaGuideApp extends StatelessWidget {
  const VitaGuideApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VitaGuide',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const HomeShell(),
    );
  }
}
