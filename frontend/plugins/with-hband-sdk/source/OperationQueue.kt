/**
 * OperationQueue — Serial FIFO für alle SDK-Aufrufe.
 *
 * Das Veepoo-Band unterstützt KEINE parallelen Operationen.
 * Jede SDK-Methode wird durch diese Queue gepusht und wartet, bis die
 * vorige Operation ihren Callback abgeschlossen hat (oder Timeout hit).
 *
 * Nutzung:
 *   OperationQueue.enqueue("readBattery", 5000) { done ->
 *     VPOperateManager.getInstance().readBattery(writeResp, listener)
 *     // listener ruft done() nach erfolgreichem Callback
 *   }
 */
package com.emergent.stressreliefapp.xznvct.hband

import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

object OperationQueue {
    private const val TAG = "HBand.Queue"
    private val queue = ConcurrentLinkedQueue<QueuedOp>()
    private val busy = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())

    data class QueuedOp(
        val name: String,
        val timeoutMs: Long,
        val run: (done: () -> Unit) -> Unit,
    )

    fun enqueue(name: String, timeoutMs: Long = 8000, block: (done: () -> Unit) -> Unit) {
        queue.offer(QueuedOp(name, timeoutMs, block))
        drain()
    }

    private fun drain() {
        if (!busy.compareAndSet(false, true)) return
        val op = queue.poll()
        if (op == null) {
            busy.set(false)
            return
        }
        Log.d(TAG, "▶ ${op.name}")
        val timeoutRunnable = Runnable {
            Log.w(TAG, "⏱ Timeout: ${op.name}")
            finishAndDrain()
        }
        mainHandler.postDelayed(timeoutRunnable, op.timeoutMs)
        try {
            op.run {
                mainHandler.removeCallbacks(timeoutRunnable)
                finishAndDrain()
            }
        } catch (t: Throwable) {
            Log.e(TAG, "✖ ${op.name} threw", t)
            mainHandler.removeCallbacks(timeoutRunnable)
            finishAndDrain()
        }
    }

    private fun finishAndDrain() {
        busy.set(false)
        // Kurz atmen lassen, damit BLE-Callbacks fertig werden
        mainHandler.postDelayed({ drain() }, 60)
    }

    fun clear() {
        queue.clear()
    }
}
