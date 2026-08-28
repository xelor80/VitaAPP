import 'wearable_provider.dart';

/// Registry aller verfügbaren Wearable-Provider. Geräte tragen einen
/// `providerKey`; die App wählt darüber die passende Implementierung.
/// Neuer Hersteller = neue Registrierung, sonst nichts (docs/01, docs/07).
class WearableRegistry {
  final Map<String, WearableProvider Function()> _factories = {};

  void register(String providerKey, WearableProvider Function() factory) {
    _factories[providerKey] = factory;
  }

  WearableProvider? create(String providerKey) => _factories[providerKey]?.call();

  Iterable<String> get providerKeys => _factories.keys;
}
