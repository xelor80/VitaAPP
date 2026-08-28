import 'package:flutter/material.dart';
import '../../design_system/theme/tokens.dart';

/// Platzhalter für noch nicht implementierte Tabs (Trends, Coach, Entdecken, Profil).
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: Spacing.m),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: Spacing.xs),
            Text('In Vorbereitung.',
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
