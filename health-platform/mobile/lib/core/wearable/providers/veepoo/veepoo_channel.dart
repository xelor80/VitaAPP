import 'package:flutter/services.dart';

/// Verträge der Platform-Channels zur nativen Veepoo-SDK.
///
/// Native Wrapper (iOS Swift um `.framework`, Android Kotlin um `.aar`)
/// übersetzen SDK-Callbacks in dieses einheitliche JSON-Protokoll. Die
/// Dart-Seite mappt es in normalisierte Modelle (docs/07, docs/19).
class VeepooChannel {
  static const MethodChannel commands = MethodChannel('wearable/commands');
  static const EventChannel events = EventChannel('wearable/events');

  // Kommando-Namen (Request/Response über [commands.invokeMethod]).
  static const String scan = 'scan';
  static const String connect = 'connect'; // args: { id, password }
  static const String disconnect = 'disconnect';
  static const String capabilities = 'capabilities';
  static const String deviceInfo = 'deviceInfo';
  static const String battery = 'battery';
  static const String sync = 'sync'; // args: { sinceEpochMs? }
  static const String recordEcg = 'recordEcg';
  static const String startRealtime = 'startRealtime'; // args: { metric }
  static const String stopRealtime = 'stopRealtime';

  // Event-Typen (über [events.receiveBroadcastStream]).
  static const String evtConnectionState = 'connectionState';
  static const String evtRealtimeMeasurement = 'realtimeMeasurement';
  static const String evtSyncProgress = 'syncProgress';
}
