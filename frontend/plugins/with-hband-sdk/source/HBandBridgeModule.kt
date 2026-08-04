/**
 * HBandBridgeModule — Native-Bridge zum Veepoo/HBand SDK.
 *
 * Phase A (fertig): init, permissions, isBluetoothEnabled, startScan, stopScan
 * Phase B (Stub):   connect, confirmPassword, syncPersonInfo, disconnect, readBattery
 * Phase C (Stub):   startDetectHeart/SpO2/HRV/ECG + stop*
 * Phase D (Stub):   syncHealthData
 *
 * Events (via DeviceEventEmitter):
 *   HBand:scanResult        { id, name, rssi, scanRecordHex }
 *   HBand:scanStopped       {}
 *   HBand:connectionState   { state, reason? }
 *   HBand:realtimeSample    { metric, value, unit, timestamp, qualityOk }
 *   HBand:ecgWaveform       { samples: number[], samplingHz: 250, timestamp }
 *   HBand:ecgHeartRate      { value, timestamp }
 *   HBand:error             { where, message }
 */
package com.emergent.stressreliefapp.xznvct.hband

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class HBandBridgeModule(
    private val reactCtx: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactCtx) {

    companion object {
        private const val TAG = "HBandBridge"
        const val NAME = "HBandBridge"

        // Event names — MUST match JS-side
        const val EVT_SCAN_RESULT = "HBand:scanResult"
        const val EVT_SCAN_STOPPED = "HBand:scanStopped"
        const val EVT_CONN_STATE = "HBand:connectionState"
        const val EVT_REALTIME = "HBand:realtimeSample"
        const val EVT_ECG_WAVE = "HBand:ecgWaveform"
        const val EVT_ECG_HR = "HBand:ecgHeartRate"
        const val EVT_ERROR = "HBand:error"
    }

    override fun getName(): String = NAME

    // Wir laden VPOperateManager lazy via Reflection, damit auch bei fehlender
    // AAR (z.B. Expo Go) das Bundle-Loading nicht crasht.
    private var vpManager: Any? = null
    private var sdkAvailable: Boolean = false

    private fun ensureSdkLoaded(): Boolean {
        if (sdkAvailable && vpManager != null) return true
        return try {
            val clazz = Class.forName("com.veepoo.protocol.VPOperateManager")
            val getInstance = clazz.getMethod("getInstance")
            vpManager = getInstance.invoke(null)
            // init(context)
            val initMethod = clazz.getMethod("init", Context::class.java)
            initMethod.invoke(vpManager, reactCtx.applicationContext)
            sdkAvailable = true
            Log.d(TAG, "VPOperateManager loaded & initialized")
            true
        } catch (t: Throwable) {
            Log.e(TAG, "VPOperateManager not available: ${t.message}")
            sdkAvailable = false
            false
        }
    }

    private fun emit(name: String, params: WritableMap) {
        reactCtx
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    private fun emitError(where: String, message: String) {
        val m = Arguments.createMap()
        m.putString("where", where)
        m.putString("message", message)
        emit(EVT_ERROR, m)
    }

    /* ─────────────────────────────────────────────────────────────────────
     *  Phase A: Init + Permissions + Scan
     * ──────────────────────────────────────────────────────────────────── */

    @ReactMethod
    fun init(promise: Promise) {
        val loaded = ensureSdkLoaded()
        val m = Arguments.createMap()
        m.putBoolean("ok", loaded)
        m.putString("version", if (loaded) "vpprotocol-2.3.75.15" else "n/a")
        m.putBoolean("sdkAvailable", loaded)
        promise.resolve(m)
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val ctx = reactCtx.applicationContext
        val needed = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            needed += Manifest.permission.BLUETOOTH_SCAN
            needed += Manifest.permission.BLUETOOTH_CONNECT
        } else {
            needed += Manifest.permission.BLUETOOTH
            needed += Manifest.permission.BLUETOOTH_ADMIN
            needed += Manifest.permission.ACCESS_FINE_LOCATION
            needed += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        val denied = needed.filter {
            ContextCompat.checkSelfPermission(ctx, it) != PackageManager.PERMISSION_GRANTED
        }
        val m = Arguments.createMap()
        m.putBoolean("granted", denied.isEmpty())
        val deniedArr = Arguments.createArray()
        denied.forEach { deniedArr.pushString(it) }
        m.putArray("denied", deniedArr)
        // Note: Der eigentliche Runtime-Prompt läuft in JS via PermissionsAndroid
        // — dieses Modul liefert nur den Ist-Zustand.
        promise.resolve(m)
    }

    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        val ctx = reactCtx.applicationContext
        val mgr = ctx.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter: BluetoothAdapter? = mgr?.adapter
        promise.resolve(adapter?.isEnabled == true)
    }

    /* Scan --------------------------------------------------------------- */

    private var scanActive = false

    @ReactMethod
    fun startScan(promise: Promise) {
        if (!ensureSdkLoaded()) {
            promise.reject("SDK_UNAVAILABLE", "VPOperateManager konnte nicht geladen werden.")
            return
        }
        if (scanActive) {
            promise.resolve(null); return
        }
        try {
            // SearchResponse dynamisch bauen via Proxy, damit wir nicht direkt
            // gegen SDK-Klassen linken (schützt bei fehlender AAR im Debug).
            val searchResponseClass = Class.forName("com.inuker.bluetooth.library.search.SearchResponse")
            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                searchResponseClass.classLoader,
                arrayOf(searchResponseClass),
            ) { _, method, args ->
                when (method.name) {
                    "onSearchStarted" -> {
                        Log.d(TAG, "Scan started")
                    }
                    "onDeviceFounded" -> {
                        val sr = args?.getOrNull(0)
                        emitDiscoveredDevice(sr)
                    }
                    "onSearchStopped", "onSearchCanceled" -> {
                        scanActive = false
                        emit(EVT_SCAN_STOPPED, Arguments.createMap())
                    }
                }
                null
            }
            val startMethod = vpManager!!.javaClass.getMethod(
                "startScanDevice", searchResponseClass,
            )
            startMethod.invoke(vpManager, proxy)
            scanActive = true
            promise.resolve(null)
        } catch (t: Throwable) {
            Log.e(TAG, "startScan failed", t)
            emitError("startScan", t.message ?: "unknown")
            promise.reject("SCAN_FAILED", t.message, t)
        }
    }

    @ReactMethod
    fun stopScan(promise: Promise) {
        if (!ensureSdkLoaded()) { promise.resolve(null); return }
        try {
            vpManager!!.javaClass.getMethod("stopScanDevice").invoke(vpManager)
        } catch (t: Throwable) {
            Log.w(TAG, "stopScan: ${t.message}")
        }
        scanActive = false
        emit(EVT_SCAN_STOPPED, Arguments.createMap())
        promise.resolve(null)
    }

    private fun emitDiscoveredDevice(searchResult: Any?) {
        if (searchResult == null) return
        try {
            val cls = searchResult.javaClass
            val bluetoothDevice = cls.getMethod("getDevice").invoke(searchResult)
            val name = bluetoothDevice?.javaClass?.getMethod("getName")?.invoke(bluetoothDevice) as? String
            val address = bluetoothDevice?.javaClass?.getMethod("getAddress")?.invoke(bluetoothDevice) as? String
            val rssi = try { cls.getMethod("getRssi").invoke(searchResult) as? Int } catch (_: Throwable) { null }
            val m = Arguments.createMap()
            m.putString("id", address ?: return)
            m.putString("name", name ?: "Unbekanntes Gerät")
            if (rssi != null) m.putInt("rssi", rssi)
            m.putString("provider", "hband")
            emit(EVT_SCAN_RESULT, m)
        } catch (t: Throwable) {
            Log.w(TAG, "emitDiscoveredDevice failed: ${t.message}")
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
     *  Phase B–D: STUBS (rejecten mit klarer Fehlermeldung)
     *
     *  Diese Methoden werden nach Phase A schrittweise implementiert.
     *  Sie sind hier bereits registriert, damit die JS-Bridge sie aufrufen
     *  kann und der Provider frühzeitig einen "not yet implemented"-Error
     *  bekommt statt eines Undefined-Errors.
     * ──────────────────────────────────────────────────────────────────── */

    private fun notImplemented(what: String, promise: Promise) {
        promise.reject("NOT_IMPLEMENTED", "$what wird in Phase B/C/D implementiert.")
    }

    @ReactMethod fun connect(mac: String, promise: Promise) = notImplemented("connect", promise)
    @ReactMethod fun confirmPassword(pwd: String, is24h: Boolean, promise: Promise) = notImplemented("confirmPassword", promise)
    @ReactMethod fun syncPersonInfo(info: ReadableMap, promise: Promise) = notImplemented("syncPersonInfo", promise)
    @ReactMethod fun disconnect(promise: Promise) = notImplemented("disconnect", promise)
    @ReactMethod fun readBattery(promise: Promise) = notImplemented("readBattery", promise)

    @ReactMethod fun startDetectHeart(promise: Promise) = notImplemented("startDetectHeart", promise)
    @ReactMethod fun stopDetectHeart(promise: Promise) = notImplemented("stopDetectHeart", promise)
    @ReactMethod fun startDetectSpO2(promise: Promise) = notImplemented("startDetectSpO2", promise)
    @ReactMethod fun stopDetectSpO2(promise: Promise) = notImplemented("stopDetectSpO2", promise)
    @ReactMethod fun startDetectHRV(promise: Promise) = notImplemented("startDetectHRV", promise)
    @ReactMethod fun stopDetectHRV(promise: Promise) = notImplemented("stopDetectHRV", promise)
    @ReactMethod fun startDetectECG(promise: Promise) = notImplemented("startDetectECG", promise)
    @ReactMethod fun stopDetectECG(promise: Promise) = notImplemented("stopDetectECG", promise)

    @ReactMethod fun syncHealthData(sinceISO: String?, promise: Promise) = notImplemented("syncHealthData", promise)

    // Für RN-Event-Emitter — muss vorhanden sein, sonst RN-Warning
    @ReactMethod fun addListener(eventName: String) { /* no-op, Emitter läuft direkt */ }
    @ReactMethod fun removeListeners(count: Int) { /* no-op */ }
}
