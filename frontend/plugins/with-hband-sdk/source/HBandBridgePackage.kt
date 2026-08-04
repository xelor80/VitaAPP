/**
 * HBandBridgePackage — registriert HBandBridgeModule bei React Native.
 * Wird in MainApplication.kt via `add(HBandBridgePackage())` eingebunden
 * (automatisiert durch das Config-Plugin `with-hband-sdk`).
 */
package com.emergent.stressreliefapp.xznvct.hband

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class HBandBridgePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): MutableList<NativeModule> {
        return mutableListOf(HBandBridgeModule(context))
    }

    override fun createViewManagers(
        context: ReactApplicationContext
    ): MutableList<ViewManager<View, ReactShadowNode<*>>> = mutableListOf()
}
