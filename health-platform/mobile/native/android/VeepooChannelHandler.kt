package app.vitaguide.wearable

// REFERENZ-IMPLEMENTIERUNG (Gerüst). Kompiliert erst mit eingebundener Veepoo-SDK
// (vpprotocol/vpbluetooth .aar) und Flutter-Engine. Siehe ../README.md.
//
// Übersetzt die MethodChannel/EventChannel-Kommandos (veepoo_channel.dart) in
// Aufrufe der VPOperateManager-API und mappt die SDK-Callbacks in das
// einheitliche JSON-Protokoll (docs/07, docs/19). Alle Werte NORMALISIERT,
// Zeitstempel in Epoch-Millis (UTC-Normalisierung erfolgt in Dart).

import android.content.Context
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

// import com.veepoo.protocol.VPOperateManager
// import com.veepoo.protocol.listener.data.*
// import com.veepoo.protocol.model.datas.*

class VeepooChannelHandler(
    private val context: Context,
) : MethodChannel.MethodCallHandler, EventChannel.StreamHandler {

    private var events: EventChannel.EventSink? = null
    // private val vp = VPOperateManager.getMangerInstance(context)

    companion object {
        const val COMMANDS = "wearable/commands"
        const val EVENTS = "wearable/events"
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "scan" -> scan(call.argument<Int>("timeoutMs") ?: 10000, result)
            "connect" -> connect(
                call.argument<String>("id")!!,
                call.argument<String>("password") ?: "0000",
                result,
            )
            "disconnect" -> disconnect(result)
            "capabilities" -> capabilities(result)
            "deviceInfo" -> deviceInfo(result)
            "battery" -> battery(result)
            "sync" -> sync(call.argument<Long>("sinceEpochMs"), result)
            "recordEcg" -> recordEcg(result)
            "startRealtime" -> startRealtime(call.argument<String>("metric")!!, result)
            "stopRealtime" -> stopRealtime(result)
            else -> result.notImplemented()
        }
    }

    // --- EventChannel ---
    override fun onListen(arguments: Any?, sink: EventChannel.EventSink?) {
        events = sink
    }

    override fun onCancel(arguments: Any?) {
        events = null
    }

    private fun emit(type: String, payload: Map<String, Any?>) {
        events?.success(payload + mapOf("type" to type))
    }

    // --- Kommandos (SDK-Aufrufe als TODO, Namen aus docs/19) ---

    private fun scan(timeoutMs: Int, result: MethodChannel.Result) {
        // TODO: vp.startScanDevice(SearchResponse{ onSearchResults -> Liste sammeln })
        // Ergebnis: List<Map> mit id (mac), name, rssi
        result.success(emptyList<Map<String, Any?>>())
    }

    private fun connect(id: String, password: String, result: MethodChannel.Result) {
        // TODO: vp.connectDevice(id, IConnectResponse, INotifyResponse)
        // Nach Verbindung: vp.confirmDevicePwd(...) mit
        //   IPwdDataListener (Firmware/Version -> PwdData)
        //   IDeviceFuctionDataListener (Capabilities -> DeviceFunctionPackage1..5)
        // connectionState-Events über emit("connectionState", {state: "connected"})
        result.success(null)
    }

    private fun disconnect(result: MethodChannel.Result) {
        // TODO: vp.disconnectWatch(IBleWriteResponse)
        result.success(null)
    }

    private fun capabilities(result: MethodChannel.Result) {
        // TODO: aus DeviceFunctionPackage1..5 die unterstützten Metriken ableiten
        //   und als List<String> mit den internen Keys (heart_rate, spo2, ...) liefern.
        //   NUR real gemeldete Fähigkeiten (docs/50) – z. B. ecg nur wenn ecgType > 0.
        result.success(emptyList<String>())
    }

    private fun deviceInfo(result: MethodChannel.Result) {
        // TODO: aus PwdData: deviceVersion (firmware), deviceNumber (model), serial
        result.success(mapOf("model" to "Mecorly V500"))
    }

    private fun battery(result: MethodChannel.Result) {
        // TODO: vp.readBattery(IBleWriteResponse, IBatteryDataListener -> BatteryData.batteryPercent)
        result.success(null)
    }

    private fun sync(sinceEpochMs: Long?, result: MethodChannel.Result) {
        // WICHTIG: SDK verträgt keine parallelen Operationen -> serielle Queue liegt
        // bereits in Dart (CommandQueue). Tages-Voll-Sync:
        // TODO: vp.readAllHealthDataBySettingOriginData(IAllHealthDataListener, day, position, watchday)
        //   -> HR (5-min), SpO2, BP (high/low), HRV, Sleep, Steps sammeln und in
        //      { "measurements": [ {metric,value,unit,timeEpochMs,ingestKey,quality} ] } mappen.
        result.success(mapOf("measurements" to emptyList<Map<String, Any?>>()))
    }

    private fun recordEcg(result: MethodChannel.Result) {
        // TODO nur wenn ecgType > 0: vp.startDetectECG(resp, isNeedCurve=true, IECGDetectListener)
        //   onEcgADCChange -> samples sammeln; Ergebnis { durationSeconds, sampleRate, samples[], timeEpochMs }
        result.success(null)
    }

    private fun startRealtime(metric: String, result: MethodChannel.Result) {
        // TODO metric-abhängig:
        //   heart_rate  -> vp.startDetectHeart(resp, IHeartDataListener.onDataChange)
        //   temperature -> vp.startDetectTempture(resp, ITemptureDetectDataListener)
        // Werte über emit("realtimeMeasurement", {metric, value, unit, timeEpochMs})
        result.success(null)
    }

    private fun stopRealtime(result: MethodChannel.Result) {
        // TODO: vp.stopDetectHeart(resp) / stopDetectTempture(...)
        result.success(null)
    }
}
