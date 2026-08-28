import Foundation
import Flutter

// REFERENZ-IMPLEMENTIERUNG (Gerüst). Kompiliert erst mit eingebundenem
// Veepoo-iOS-Framework (VPBluetooth) und Flutter-Engine. Siehe ../README.md.
//
// Spiegelt den MethodChannel/EventChannel-Vertrag (veepoo_channel.dart) und
// mappt VPBleCentralManager-Callbacks in das einheitliche JSON-Protokoll
// (docs/07, docs/19). Werte NORMALISIERT, Zeit als Epoch-Millis.

// import VPBluetooth

final class VeepooChannelHandler: NSObject, FlutterStreamHandler {

    static let commands = "wearable/commands"
    static let events = "wearable/events"

    private var eventSink: FlutterEventSink?
    // private let manager = VPBleCentralManage.sharedBleManager()

    func register(with registrar: FlutterPluginRegistrar) {
        let methodChannel = FlutterMethodChannel(
            name: VeepooChannelHandler.commands,
            binaryMessenger: registrar.messenger())
        methodChannel.setMethodCallHandler(handle)

        let eventChannel = FlutterEventChannel(
            name: VeepooChannelHandler.events,
            binaryMessenger: registrar.messenger())
        eventChannel.setStreamHandler(self)
    }

    // MARK: - MethodChannel

    private func handle(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
        let args = call.arguments as? [String: Any] ?? [:]
        switch call.method {
        case "scan":
            scan(timeoutMs: args["timeoutMs"] as? Int ?? 10000, result: result)
        case "connect":
            connect(id: args["id"] as! String,
                    password: args["password"] as? String ?? "0000",
                    result: result)
        case "disconnect": disconnect(result)
        case "capabilities": capabilities(result)
        case "deviceInfo": deviceInfo(result)
        case "battery": battery(result)
        case "sync": sync(sinceEpochMs: args["sinceEpochMs"] as? Int64, result: result)
        case "recordEcg": recordEcg(result)
        case "startRealtime": startRealtime(metric: args["metric"] as! String, result: result)
        case "stopRealtime": stopRealtime(result)
        default: result(FlutterMethodNotImplemented)
        }
    }

    // MARK: - EventChannel

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }

    private func emit(_ type: String, _ payload: [String: Any?]) {
        var out = payload
        out["type"] = type
        eventSink?(out)
    }

    // MARK: - Kommandos (SDK-Aufrufe als TODO, Namen aus docs/19)

    private func scan(timeoutMs: Int, result: @escaping FlutterResult) {
        // TODO: manager.peripheralManage.veepooSDKStartScanDevice(...andReceiveScanningDevice:)
        //   -> [ { id, name, rssi } ]
        result([[String: Any]]())
    }

    private func connect(id: String, password: String, result: @escaping FlutterResult) {
        // TODO: veepooSDKConnectDevice:deviceConnectBlock: ; Passwort/Handshake im Connect.
        //   Capabilities aus VPPeripheralModel (deviceFuctionData, ecgType, hrvType, ...).
        //   connectionState -> emit("connectionState", ["state": "connected"])
        result(nil)
    }

    private func disconnect(_ result: @escaping FlutterResult) {
        // TODO: veepooSDKDisconnectDevice
        result(nil)
    }

    private func capabilities(_ result: @escaping FlutterResult) {
        // TODO: aus VPPeripheralModel-Flags interne Keys ableiten (nur real unterstützte).
        result([String]())
    }

    private func deviceInfo(_ result: @escaping FlutterResult) {
        result(["model": "Mecorly V500"])
    }

    private func battery(_ result: @escaping FlutterResult) {
        // TODO: veepooSDKReadDeviceBatteryInfo:
        result(nil)
    }

    private func sync(sinceEpochMs: Int64?, result: @escaping FlutterResult) {
        // TODO: veepooSdkStartReadDeviceAllDataWithReadStateChangeBlock:
        //   -> HR/SpO2/BP/HRV/Sleep/Steps sammeln -> ["measurements": [...]]
        result(["measurements": [[String: Any]]()])
    }

    private func recordEcg(_ result: @escaping FlutterResult) {
        // TODO nur wenn ecgType > 0: veepooSDKTestECGStart:testResult:
        result(nil)
    }

    private func startRealtime(metric: String, result: @escaping FlutterResult) {
        // TODO: heart_rate -> veepooSDKTestHeartStart:testResult: ; temperature -> veepooSDK_temperatureTestStart:result:
        //   emit("realtimeMeasurement", ["metric": metric, "value": ..., "unit": ..., "timeEpochMs": ...])
        result(nil)
    }

    private func stopRealtime(_ result: @escaping FlutterResult) {
        result(nil)
    }
}
