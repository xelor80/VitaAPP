import 'dart:async';
import 'dart:collection';

/// Serielle Befehls-Queue.
///
/// Die Veepoo-SDK verträgt KEINE parallelen BLE-Operationen (docs/19 §5).
/// Alle Provider-Aufrufe laufen daher durch diese Queue: immer nur ein
/// Kommando gleichzeitig, mit Timeout. Verhindert Datenfehler.
class CommandQueue {
  CommandQueue({this.defaultTimeout = const Duration(seconds: 20)});

  final Duration defaultTimeout;
  final Queue<_Job<dynamic>> _jobs = Queue<_Job<dynamic>>();
  bool _running = false;

  Future<T> run<T>(Future<T> Function() task, {Duration? timeout}) {
    final job = _Job<T>(task, timeout ?? defaultTimeout);
    _jobs.add(job);
    _drain();
    return job.completer.future;
  }

  Future<void> _drain() async {
    if (_running) return;
    _running = true;
    while (_jobs.isNotEmpty) {
      final job = _jobs.removeFirst();
      try {
        final result = await job.task().timeout(job.timeout);
        job.completer.complete(result);
      } catch (e, st) {
        job.completer.completeError(e, st);
      }
    }
    _running = false;
  }
}

class _Job<T> {
  _Job(this.task, this.timeout);
  final Future<T> Function() task;
  final Duration timeout;
  final Completer<T> completer = Completer<T>();
}
