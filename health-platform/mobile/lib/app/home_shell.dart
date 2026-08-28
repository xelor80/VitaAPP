import 'package:flutter/material.dart';
import '../features/common/placeholder_screen.dart';
import '../features/today/today_screen.dart';

/// Hauptnavigation (docs/38): Heute · Trends · Coach · Entdecken · Profil.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = <Widget>[
    TodayScreen(),
    PlaceholderScreen(title: 'Trends', icon: Icons.show_chart),
    PlaceholderScreen(title: 'Coach', icon: Icons.psychology_outlined),
    PlaceholderScreen(title: 'Entdecken', icon: Icons.explore_outlined),
    PlaceholderScreen(title: 'Profil', icon: Icons.person_outline),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _tabs[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today_outlined), label: 'Heute'),
          NavigationDestination(icon: Icon(Icons.show_chart), label: 'Trends'),
          NavigationDestination(
              icon: Icon(Icons.psychology_outlined), label: 'Coach'),
          NavigationDestination(
              icon: Icon(Icons.explore_outlined), label: 'Entdecken'),
          NavigationDestination(
              icon: Icon(Icons.person_outline), label: 'Profil'),
        ],
      ),
    );
  }
}
