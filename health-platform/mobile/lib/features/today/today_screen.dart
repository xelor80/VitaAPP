import 'package:flutter/material.dart';
import '../../design_system/theme/tokens.dart';

/// Today-Dashboard (docs/04 /today, docs/13). GERÜST: statischer Aufbau,
/// bindet später an GET /api/v1/today. Zeigt ehrliche Leerzustände.
class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(Spacing.m),
        children: [
          // Begrüßung (Text kommt später über i18n-Keys vom Backend)
          Text('Guten Morgen', style: theme.textTheme.titleMedium),
          Text(
            'Heute',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: theme.colorScheme.outline),
          ),
          const SizedBox(height: Spacing.l),

          // Health-Score (Platzhalter, bis Daten vorliegen)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.l),
              child: Column(
                children: [
                  Text('HEALTH SCORE',
                      style: theme.textTheme.labelMedium
                          ?.copyWith(letterSpacing: 1.2)),
                  const SizedBox(height: Spacing.s),
                  Text('–',
                      style: theme.textTheme.displayMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: Spacing.xs),
                  Text('Noch keine Daten vorhanden.',
                      style: theme.textTheme.bodySmall),
                ],
              ),
            ),
          ),

          const SizedBox(height: Spacing.m),
          Text('Heute wichtig', style: theme.textTheme.titleSmall),
          const SizedBox(height: Spacing.s),
          const _EmptyMetrics(),
        ],
      ),
    );
  }
}

class _EmptyMetrics extends StatelessWidget {
  const _EmptyMetrics();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Spacing.l),
        child: Row(
          children: [
            const Icon(Icons.watch_outlined),
            const SizedBox(width: Spacing.m),
            Expanded(
              child: Text(
                'Verbinde dein Health Band, um deine Werte zu sehen.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
