//
//  HBandBridge.swift — iOS Native Bridge zum Veepoo/HBand SDK
//
//  Status: Skeleton (Phase E — kommt nach erfolgreichem Android-Test).
//  Wird beim `expo prebuild` NICHT automatisch aktiviert — der User muss
//  in Phase E die Datei nach ios/HBandBridge/ kopieren und im Xcode-Projekt
//  registrieren (dokumentiert in HBAND_PHASE_E_TODO.md).
//
//  Spiegel-Symmetrie zum Kotlin-Modul: gleiche Methoden-Namen, gleiche Events,
//  gleiche JS-Interface-Signaturen wie in HBandProvider.ts.
//

import Foundation
import CoreBluetooth
import React

// Placeholder — echte Imports werden in Phase E aktiviert:
// import VeepooBleSDK

@objc(HBandBridge)
class HBandBridge: RCTEventEmitter {

  // MARK: - Lifecycle

  override init() {
    super.init()
    // TODO: VPBleCentralManage.share().delegate = self
  }

  override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String] {
    return [
      "HBand:scanResult",
      "HBand:scanStopped",
      "HBand:connectionState",
      "HBand:realtimeSample",
      "HBand:ecgWaveform",
      "HBand:ecgHeartRate",
      "HBand:error",
    ]
  }

  // MARK: - Phase A: Init + Scan

  @objc(init:rejecter:)
  func initSdk(_ resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO Phase E:
    //   VPBleCentralManage.share().setBleStateDelegate(self)
    resolve(["ok": true, "version": "VeepooBleSDK-2.2.97.15", "sdkAvailable": true])
  }

  @objc(requestPermissions:rejecter:)
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    // iOS: BT-Permission wird durch CoreBluetooth automatisch beim ersten Zugriff geprompted.
    // Kein Manifest-Check nötig — nur Info.plist NSBluetoothAlwaysUsageDescription
    resolve(["granted": true, "denied": []])
  }

  @objc(isBluetoothEnabled:rejecter:)
  func isBluetoothEnabled(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO Phase E: return VPBleCentralManage.share().bluetoothState() == .poweredOn
    resolve(false)
  }

  @objc(startScan:rejecter:)
  func startScan(_ resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO Phase E:
    //   VPBleCentralManage.share().scanForPeripherals { peripheral, advData, rssi in
    //     self.sendEvent(withName: "HBand:scanResult", body: [
    //       "id": peripheral.identifier.uuidString,
    //       "name": peripheral.name ?? "Unbekannt",
    //       "rssi": rssi,
    //       "provider": "hband",
    //     ])
    //   }
    reject("NOT_IMPLEMENTED", "iOS-Bridge wird in Phase E aktiviert", nil)
  }

  @objc(stopScan:rejecter:)
  func stopScan(_ resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO Phase E: VPBleCentralManage.share().stopScan()
    resolve(nil)
  }

  // MARK: - Phase B-D: Skeletons

  @objc(connect:resolver:rejecter:)
  func connect(_ mac: String,
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "Phase E — Connect kommt nach Android-Test", nil)
  }

  @objc(confirmPassword:is24h:resolver:rejecter:)
  func confirmPassword(_ pwd: String, is24h: Bool,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "Phase E", nil)
  }

  @objc(disconnect:rejecter:)
  func disconnect(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(nil)
  }

  @objc(readBattery:rejecter:)
  func readBattery(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "Phase E", nil)
  }

  // Realtime measurements
  @objc func startDetectHeart(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { reject("NOT_IMPLEMENTED", "Phase E", nil) }
  @objc func stopDetectHeart(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }
  @objc func startDetectSpO2(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { reject("NOT_IMPLEMENTED", "Phase E", nil) }
  @objc func stopDetectSpO2(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }
  @objc func startDetectHRV(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { reject("NOT_IMPLEMENTED", "Phase E", nil) }
  @objc func stopDetectHRV(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }
  @objc func startDetectECG(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { reject("NOT_IMPLEMENTED", "Phase E", nil) }
  @objc func stopDetectECG(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(syncHealthData:resolver:rejecter:)
  func syncHealthData(_ sinceISO: String?,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "Phase E", nil)
  }
}
