/**
 * with-hband-sdk — Expo Config-Plugin für die Veepoo/HBand SDK Integration.
 *
 * Was es bei `expo prebuild` (bzw. `eas build`) macht:
 *   1) Kopiert alle 7 AAR-Dateien aus /android/libs → android/app/libs
 *   2) Kopiert Kotlin-Sources unter source/ → android/app/src/main/java/<package>/hband/
 *   3) Mutiert android/app/build.gradle:
 *        - fügt `flatDir { dirs 'libs' }` hinzu
 *        - fügt alle implementation-files-AARs hinzu
 *        - fügt Maven-Deps hinzu (Nordic, mcumgr, localbroadcastmanager, gson)
 *        - fügt `apply plugin: 'kotlin-android'` hinzu falls fehlt
 *   4) Mutiert AndroidManifest.xml:
 *        - fügt <service com.inuker.bluetooth.library.BluetoothService/> ein
 *   5) Mutiert MainApplication.kt:
 *        - registriert HBandBridgePackage in getPackages()
 *
 * Deaktivierung: `EXPO_SKIP_HBAND_SDK=1 expo prebuild` überspringt das Plugin.
 */
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
} = require('@expo/config-plugins');

const AARS = [
  'vpprotocol-2.3.75.15.aar',
  'vpbluetooth-1.20.aar',
  'BmpConvert_V1.6.0_10604-release.aar',
  'JL_Watch_V1.13.1_11214-release.aar',
  'abpartool-release.aar',
  'jl_bt_ota_V1.10.0_10931-release.aar',
  'jl_rcsp_V0.7.2_527-release.aar',
];

const IOS_FRAMEWORKS = [
  'VeepooBleSDK.framework',
  'iOSMcuManagerLibrary.framework',
  'ZIPFoundation.framework',
  'SwiftCBOR.framework',
  'GRDFUSDK.framework',
  'ABParTool.framework',
];

const KOTLIN_FILES = [
  'HBandBridgeModule.kt',
  'HBandBridgePackage.kt',
  'OperationQueue.kt',
];

const KOTLIN_SUBPACKAGE = 'hband';

/* ─────────────────────────────────────────────────────────────────────
 *  1) Copy AARs + Kotlin sources into the prebuilt android/ folder.
 * ──────────────────────────────────────────────────────────────────── */
function withHBandFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;

      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = cfg.modRequest.platformProjectRoot;

      // AARs kopieren
      const aarSrcDir = path.join(projectRoot, 'android', 'libs');
      const aarDstDir = path.join(androidRoot, 'app', 'libs');
      fs.mkdirSync(aarDstDir, { recursive: true });
      for (const aar of AARS) {
        const src = path.join(aarSrcDir, aar);
        const dst = path.join(aarDstDir, aar);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
      }

      // Kotlin sources kopieren
      const androidPkg = cfg.android?.package;
      if (!androidPkg) throw new Error('[with-hband-sdk] android.package fehlt in app.json');
      const kotlinDstDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        ...androidPkg.split('.'),
        KOTLIN_SUBPACKAGE,
      );
      fs.mkdirSync(kotlinDstDir, { recursive: true });
      const srcDir = path.join(__dirname, 'source');
      for (const f of KOTLIN_FILES) {
        const src = path.join(srcDir, f);
        const dst = path.join(kotlinDstDir, f);
        if (fs.existsSync(src)) {
          let content = fs.readFileSync(src, 'utf8');
          // Package-Deklaration an app.json angleichen
          const targetPkg = `${androidPkg}.${KOTLIN_SUBPACKAGE}`;
          content = content.replace(
            /^package\s+[a-zA-Z0-9_.]+/m,
            `package ${targetPkg}`,
          );
          fs.writeFileSync(dst, content);
        }
      }
      return cfg;
    },
  ]);
}

/* ─────────────────────────────────────────────────────────────────────
 *  2) Mutate android/app/build.gradle.
 * ──────────────────────────────────────────────────────────────────── */
function withHBandGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;
    let src = cfg.modResults.contents;

    // 2a) Kotlin-Plugin einfügen falls fehlt (Expo 54 hat es meist schon)
    if (!/apply plugin:\s*['"]kotlin-android['"]/.test(src) &&
        !/id\(?["']org\.jetbrains\.kotlin\.android["']\)?/.test(src)) {
      src = src.replace(
        /apply plugin:\s*["']com\.android\.application["']/,
        `apply plugin: "com.android.application"\napply plugin: "kotlin-android"`,
      );
    }

    // 2b) flatDir repositories block
    if (!/flatDir\s*\{\s*dirs\s*['"]libs['"]/.test(src)) {
      // Am Ende der Datei einen repositories-Block anhängen
      src += `

// [with-hband-sdk] Local .aar files
repositories {
    flatDir {
        dirs "libs"
    }
}
`;
    }

    // 2c) Dependencies einfügen
    const marker = '// [with-hband-sdk] injected dependencies';
    if (!src.includes(marker)) {
      const depsBlock = `

${marker}
dependencies {
    implementation(name: "vpprotocol-2.3.75.15", ext: "aar")
    implementation(name: "vpbluetooth-1.20", ext: "aar")
    implementation(name: "BmpConvert_V1.6.0_10604-release", ext: "aar")
    implementation(name: "JL_Watch_V1.13.1_11214-release", ext: "aar")
    implementation(name: "abpartool-release", ext: "aar")
    implementation(name: "jl_bt_ota_V1.10.0_10931-release", ext: "aar")
    implementation(name: "jl_rcsp_V0.7.2_527-release", ext: "aar")

    implementation "com.google.code.gson:gson:2.10.1"
    implementation "androidx.localbroadcastmanager:localbroadcastmanager:1.1.0"
    implementation "no.nordicsemi.android.support.v18:scanner:1.6.0"
    implementation "no.nordicsemi.android:mcumgr-core:2.7.4"
    implementation "no.nordicsemi.android:mcumgr-ble:2.7.4"
}
`;
      src += depsBlock;
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

/* ─────────────────────────────────────────────────────────────────────
 *  3) Add <service> to AndroidManifest.
 * ──────────────────────────────────────────────────────────────────── */
function withHBandManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.service = app.service || [];
    const svcName = 'com.inuker.bluetooth.library.BluetoothService';
    const has = app.service.some((s) => s.$?.['android:name'] === svcName);
    if (!has) {
      app.service.push({ $: { 'android:name': svcName, 'android:exported': 'false' } });
    }
    return cfg;
  });
}

/* ─────────────────────────────────────────────────────────────────────
 *  4) Register HBandBridgePackage in MainApplication.kt.
 * ──────────────────────────────────────────────────────────────────── */
function withHBandMainApplication(config) {
  return withMainApplication(config, (cfg) => {
    if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;
    const pkgId = cfg.android?.package || cfg.modRequest?.projectName;
    if (!pkgId) return cfg;
    const fqcn = `${pkgId}.${KOTLIN_SUBPACKAGE}.HBandBridgePackage`;
    let src = cfg.modResults.contents;

    // Import einfügen
    if (!src.includes(fqcn)) {
      src = src.replace(
        /^(package\s+[^\n]+\n)/m,
        `$1\nimport ${fqcn}\n`,
      );
    }

    // In getPackages() { … return … .apply { add(HBandBridgePackage()) } }
    const addLine = 'add(HBandBridgePackage())';
    if (!src.includes(addLine)) {
      // Wir suchen den apply-Block direkt nach `PackageList(this).packages`
      src = src.replace(
        /(PackageList\(this\)\.packages\s*\.apply\s*\{)/,
        `$1\n            ${addLine}`,
      );
      // Fallback: getPackages ohne apply
      if (!src.includes(addLine)) {
        src = src.replace(
          /(val\s+packages\s*=\s*PackageList\(this\)\.packages)/,
          `$1\n        packages.add(HBandBridgePackage())`,
        );
      }
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

/* ─────────────────────────────────────────────────────────────────────
 *  Main export – chain all mutators.
 * ──────────────────────────────────────────────────────────────────── */
module.exports = function withHBandSdk(config) {
  config = withHBandFiles(config);
  config = withHBandGradle(config);
  config = withHBandManifest(config);
  config = withHBandMainApplication(config);
  config = withHBandIosFrameworks(config);
  config = withHBandIosPodfile(config);
  return config;
};

/* ═════════════════════════════════════════════════════════════════════
 *  iOS SIDE
 * ════════════════════════════════════════════════════════════════════ */

/**
 * 5) Kopiert VeepooBleSDK.framework (+ Deps) nach ios/Frameworks/
 *    Legt eine lokale Podspec `HBandSdkLocal.podspec` daneben, die alle
 *    Frameworks als vendored_frameworks bündelt.
 */
function withHBandIosFrameworks(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;

      const srcDir = path.join(projectRoot, 'plugins', 'with-hband-sdk', 'ios-frameworks');
      const dstDir = path.join(iosRoot, 'Frameworks');
      if (!fs.existsSync(srcDir)) {
        console.warn('[with-hband-sdk] ios-frameworks/ nicht gefunden — iOS-Bridge deaktiviert');
        return cfg;
      }
      fs.mkdirSync(dstDir, { recursive: true });

      const copyRecursive = (src, dst) => {
        if (fs.statSync(src).isDirectory()) {
          fs.mkdirSync(dst, { recursive: true });
          for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dst, entry));
          }
        } else {
          fs.copyFileSync(src, dst);
        }
      };

      for (const fw of IOS_FRAMEWORKS) {
        const src = path.join(srcDir, fw);
        const dst = path.join(dstDir, fw);
        if (fs.existsSync(src)) {
          if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
          copyRecursive(src, dst);
        }
      }

      // Swift/ObjC-Bridge-Files ins iOS-Projekt kopieren (unter <appName>/HBand/)
      const iosSourceDir = path.join(projectRoot, 'plugins', 'with-hband-sdk', 'ios-source');
      if (fs.existsSync(iosSourceDir)) {
        const appTargetDir = path.join(iosRoot, cfg.modRequest.projectName || 'VitaGuide', 'HBand');
        fs.mkdirSync(appTargetDir, { recursive: true });
        for (const f of fs.readdirSync(iosSourceDir)) {
          fs.copyFileSync(path.join(iosSourceDir, f), path.join(appTargetDir, f));
        }
      }

      // Podspec schreiben — sammelt alle Frameworks als vendored_frameworks
      const podspec = `# Auto-generated by with-hband-sdk config plugin.
Pod::Spec.new do |s|
  s.name         = 'HBandSdkLocal'
  s.version      = '2.2.97.15'
  s.summary      = 'Veepoo/HBand iOS SDK + OTA dependencies (local vendored frameworks)'
  s.homepage     = 'https://github.com/HBandSDK/iOS_Ble_SDK'
  s.license      = { :type => 'Apache-2.0' }
  s.author       = { 'Veepoo' => 'support@veepoo.com' }
  s.platform     = :ios, '13.0'
  s.source       = { :path => '.' }
  s.vendored_frameworks = ${IOS_FRAMEWORKS.map(f => `'${f}'`).join(', ')}
  s.frameworks   = 'CoreBluetooth', 'UIKit', 'Foundation'
  s.libraries    = 'sqlite3', 'z', 'c++'
  s.requires_arc = true
  s.pod_target_xcconfig = {
    'ENABLE_BITCODE' => 'NO',
    'DEFINES_MODULE' => 'YES',
    'OTHER_LDFLAGS' => '$(inherited) -ObjC',
  }
end
`;
      fs.writeFileSync(path.join(dstDir, 'HBandSdkLocal.podspec'), podspec);
      return cfg;
    },
  ]);
}

/**
 * 6) Patcht ios/Podfile:
 *    - fügt `pod 'HBandSdkLocal', :path => './Frameworks'` hinzu
 *    - deaktiviert use_frameworks! für statische AAR-Kompat (falls RN default anders)
 */
function withHBandIosPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      if (process.env.EXPO_SKIP_HBAND_SDK === '1') return cfg;
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;
      let src = fs.readFileSync(podfilePath, 'utf8');

      const marker = "# [with-hband-sdk] Local Veepoo SDK";
      if (!src.includes(marker)) {
        // Vor `post_install` einfügen (oder am Ende des target-Blocks)
        const injection = `\n  ${marker}\n  pod 'HBandSdkLocal', :path => './Frameworks'\n`;
        if (/post_install\s+do/.test(src)) {
          src = src.replace(/(\n\s*post_install\s+do)/, `${injection}$1`);
        } else {
          // Fallback: vor dem letzten `end` des target-Blocks einfügen
          src = src.replace(/(\n\s*end\s*$)/, `${injection}$1`);
        }
      }

      fs.writeFileSync(podfilePath, src);
      return cfg;
    },
  ]);
}
