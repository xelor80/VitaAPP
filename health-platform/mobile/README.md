# VitaGuide – Mobile App (Flutter)

Cross-Platform-App (iOS + Android). Umsetzung des Konzepts aus [`../docs`](../docs).

> **Gerüst-Status:** In dieser Umgebung ist **kein Flutter-SDK** installiert, daher wurde der Code
> hier **nicht kompiliert**. Es ist ein sauberes, idiomatisches Grundgerüst zum lokalen Weiterbauen.
> Der Schwerpunkt liegt auf dem **HAL** (`lib/core/wearable/`) – dem konzeptkritischen Teil.

## Lokal einrichten
```bash
cd health-platform/mobile
flutter create .            # erzeugt die Plattform-Ordner (android/ios/…)
flutter pub get
flutter run                 # auf Gerät/Simulator
```
> `flutter create .` legt nur die fehlenden Plattform-Ordner an und lässt `lib/` unangetastet.

## Struktur (docs/05)
```
lib/
├── main.dart
├── app/                     # App-Root + Hauptnavigation (Heute/Trends/Coach/Entdecken/Profil)
├── design_system/theme/     # Tokens + Light/Dark-Theme (docs/12)
├── core/wearable/           # HAL – Kern dieses Gerüsts
│   ├── wearable_provider.dart   # abstraktes Interface (normalisiert)
│   ├── models.dart              # normalisierte Modelle (NIE SDK-Typen)
│   ├── metric_type.dart
│   ├── command_queue.dart       # serielle BLE-Queue (Veepoo: keine Parallelität, docs/19)
│   ├── wearable_registry.dart   # Multi-Vendor-fähig
│   └── providers/veepoo/        # Veepoo/HBand-Impl. via Platform Channels
│       ├── veepoo_channel.dart  # MethodChannel/EventChannel-Vertrag
│       └── veepoo_provider.dart # Mapping SDK -> normalisierte Modelle
└── features/                # today (+ Platzhalter-Tabs)
```

## HAL-Prinzipien (docs/07, docs/19)
- Features arbeiten **nur** gegen `WearableProvider` + normalisierte Modelle, nie gegen die SDK.
- **Capability-Discovery** entscheidet, welche Metriken angezeigt werden – **keine Annahmen**
  (kein EKG ohne `ecg`-Capability), **keine erfundenen Werte** (docs/50).
- Alle BLE-Kommandos laufen durch die **serielle CommandQueue** (Veepoo verträgt keine
  parallelen Operationen).
- Gerätezeit → beim Mapping in **UTC** normalisieren (Dedup, docs/08).

## Nächste Schritte (nach PoC am Mecorly V500)
1. Native Wrapper: iOS (Swift um `.framework`) + Android (Kotlin um `.aar`) hinter
   `veepoo_channel.dart` implementieren.
2. Onboarding + Consent + BLE-Pairing-Flow (Passwort `0000`).
3. API-Client (`/api/v1`) + Offline-Cache (Drift) + Sync-Engine.
4. Today/Metrik-Detail/Trends an die Backend-Endpunkte binden.
