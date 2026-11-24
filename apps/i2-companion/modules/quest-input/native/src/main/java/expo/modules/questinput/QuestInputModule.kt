package expo.modules.questinput

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.text.TextPaint
import android.text.TextUtils
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.util.concurrent.Executors

private const val TAG = "QuestInput"

// QuestInputSampler.h in tools/quest/viro-renderer/0003-openxr-quest-input-sampler.patch.
private const val NATIVE_VERSION = 1
private const val CAPACITY = 64
private const val HEADER_LONGS = 14
private const val LONGS_PER_SAMPLE = 3
private const val INTS_PER_SAMPLE = 15
private const val FLOATS_PER_SAMPLE = 34

// A double holds every integer up to 2^53 exactly; Expo converts Long to Double.
private const val MAX_EXACT = 9007199254740991L

// Reads the raw controller samples that the patched Viro renderer records inside its
// own OpenXR session, toggles zero-lag render-thread diagnostic markers, and draws
// the sky diagnostics OpenXR quad layer on a background executor (with dirty-rect
// sub-region updates for responsive stick/trigger/grip/button readouts).
class QuestInputModule : Module() {
  private external fun nativeVersion(): Int
  private external fun nativeSetMarkersEnabled(enabled: Boolean)
  private external fun nativeRead(
    afterSeq: Long,
    header: LongArray,
    longs: LongArray,
    ints: IntArray,
    floats: FloatArray
  ): Int
  private external fun nativeProfile(hand: Int): String
  private external fun nativeDiagStatus(): Int
  private external fun nativeDiagHide()
  private external fun nativeDiagPose(pose: FloatArray): Boolean
  private external fun nativeDiagDraw(
    rgba: ByteArray,
    width: Int,
    height: Int,
    widthM: Float,
    heightM: Float,
    pose: FloatArray
  ): Boolean
  private external fun nativeDiagDrawRegion(
    rgba: ByteArray,
    dx: Int,
    dy: Int,
    dw: Int,
    dh: Int
  ): Boolean

  // Phone builds and renderers without patch 0003 have no QuestInputSampler symbols.
  private val available: Boolean by lazy {
    try {
      System.loadLibrary("viro_renderer")
      nativeVersion() == NATIVE_VERSION
    } catch (_: LinkageError) {
      false
    }
  }

  // Reused by every read. Sync functions run on the JS thread; the lock is a guard only.
  private val lock = Any()
  private val header = LongArray(HEADER_LONGS)
  private val longs = LongArray(CAPACITY * LONGS_PER_SAMPLE)
  private val ints = IntArray(CAPACITY * INTS_PER_SAMPLE)
  private val floats = FloatArray(CAPACITY * FLOATS_PER_SAMPLE)

  // Sky diagnostics panel rasterizer state (mirrors QuestPanelModule off-thread pattern).
  @Volatile private var diagOwner = 0
  @Volatile private var diagDrawFailed = false
  private val diagDrawLock = Any()
  private val diagQueueLock = Any()
  private val diagExecutor = Executors.newSingleThreadExecutor()
  private var pendingDiagDraw: Pair<Int, String>? = null
  private var pendingDiagPatch: Pair<Int, String>? = null
  private var diagDrawRunning = false
  private var diagBitmap: Bitmap? = null
  private var diagPixels: ByteArray? = null
  private val patchScratch = HashMap<Long, Pair<Bitmap, ByteArray>>()
  private var drawnDiagPixelsKey: String? = null
  private val typefaces = HashMap<String, Typeface>()
  private val warnedFonts = HashSet<String>()
  private val colorCache = HashMap<String, Int>()
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val glyphPaint = TextPaint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val scratchRect = RectF()

  // Patch cadence & CPU/JNI timing metrics (logged at ~0.5 Hz while active).
  private var perfWindowStartNs = 0L
  private var perfPatchCount = 0
  private var perfCanvasNs = 0L
  private var perfTotalNs = 0L
  private var perfBytes = 0L

  private fun exact(value: Long): Double = if (value in -MAX_EXACT..MAX_EXACT) value.toDouble() else Double.NaN

  private fun read(afterSeq: Double): Map<String, Any?> {
    if (!available) return mapOf("available" to false)
    val valid = afterSeq.isFinite() && afterSeq >= 0 && afterSeq <= MAX_EXACT && afterSeq == Math.floor(afterSeq)
    val cursor = if (valid) afterSeq.toLong() else 0L
    synchronized(lock) {
      val count = nativeRead(cursor, header, longs, ints, floats)
      if (count < 0 || count > CAPACITY) return mapOf("available" to true, "error" to "read")
      val haveOrigin = header[12] == 1L
      val originDisplay = header[10]
      val originMonotonic = header[11]
      val seq = DoubleArray(count)
      val displayTimeNs = DoubleArray(count)
      val capturedNs = DoubleArray(count)
      for (i in 0 until count) {
        val at = i * LONGS_PER_SAMPLE
        seq[i] = exact(longs[at])
        displayTimeNs[i] = exact(longs[at + 1] - originDisplay)
        capturedNs[i] = exact(longs[at + 2] - originMonotonic)
      }
      return mapOf(
        "available" to true,
        "version" to header[0].toInt(),
        "generation" to exact(header[1]),
        "live" to (header[2] == 1L),
        "actionsReady" to (header[3] == 1L),
        "latestSeq" to exact(header[4]),
        "oldestSeq" to exact(header[5]),
        "published" to exact(header[6]),
        "framesWithoutInput" to exact(header[7]),
        "rejected" to exact(header[8]),
        // Same CLOCK_MONOTONIC domain and origin as capturedNs, read after the copy.
        "nowNs" to (if (haveOrigin) exact(header[9] - originMonotonic) else null),
        "originDisplayTimeNs" to (if (haveOrigin) originDisplay.toString() else null),
        "originMonotonicNs" to (if (haveOrigin) originMonotonic.toString() else null),
        "capacity" to header[13].toInt(),
        "count" to count,
        "seq" to seq,
        "displayTimeNs" to displayTimeNs,
        "capturedNs" to capturedNs,
        "ints" to ints.copyOf(count * INTS_PER_SAMPLE),
        "floats" to floats.copyOf(count * FLOATS_PER_SAMPLE)
      )
    }
  }

  private fun releaseDiagRaster() {
    diagBitmap?.recycle()
    diagBitmap = null
    diagPixels = null
    for ((bmp, _) in patchScratch.values) {
      if (!bmp.isRecycled) bmp.recycle()
    }
    patchScratch.clear()
    drawnDiagPixelsKey = null
  }

  private fun colorOf(hex: String): Int {
    return colorCache.getOrPut(hex) { Color.parseColor(hex) }
  }

  private fun existingFile(value: String): File? {
    if (value.startsWith("file:///android_res/")) return null
    val path = when {
      value.startsWith("file:") -> Uri.parse(value).path
      value.startsWith("/") -> value
      else -> null
    } ?: return null
    if (path.startsWith("/android_res/")) return null
    val file = File(path)
    return if (file.isFile && file.length() > 0L) file else null
  }

  @SuppressLint("DiscouragedApi")
  private fun openPackaged(context: Context, value: String): InputStream? {
    if (value.startsWith("file:///android_res/")) {
      val segments = Uri.parse(value).pathSegments
      if (segments.size < 3) return null
      val directory = segments[1].substringBefore('-')
      val name = segments[2].substringBeforeLast('.', segments[2])
      val id = context.resources.getIdentifier(name, directory, context.packageName)
      return if (id != 0) context.resources.openRawResource(id) else null
    }
    if (value.contains(":")) return null
    val id = context.resources.getIdentifier(value, "raw", context.packageName).takeIf { it != 0 }
      ?: context.resources.getIdentifier(value, "drawable", context.packageName).takeIf { it != 0 }
      ?: return null
    return context.resources.openRawResource(id)
  }

  private fun sourceCacheName(value: String, extension: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    val hex = digest.joinToString("") { byte -> "%02x".format(byte) }.take(20)
    val suffix = extension.lowercase().filter { it.isLetterOrDigit() }.ifEmpty { "bin" }
    return "src-$hex.$suffix"
  }

  private fun materialize(value: String, extension: String): File {
    existingFile(value)?.let { return it }
    val context = appContext.reactContext ?: error("Quest input diagnostics has no Android context.")
    val input = openPackaged(context, value) ?: error("Quest input asset is not a file: $value")
    val directory = File(context.cacheDir, "quest-panel-src")
    if (!directory.isDirectory && !directory.mkdirs()) {
      error("Quest input cache directory was not created.")
    }
    val file = File(directory, sourceCacheName(value, extension))
    if (file.isFile && file.length() > 0L) {
      input.close()
      return file
    }
    val temp = File(directory, "${file.name}.tmp")
    try {
      input.use { stream ->
        FileOutputStream(temp).use { out ->
          val copied = stream.copyTo(out)
          if (copied <= 0L) error("Quest input asset was empty: $value")
        }
      }
      if (!temp.renameTo(file) && !file.isFile) {
        error("Quest input asset cache rename failed: $value")
      }
    } catch (failure: Exception) {
      temp.delete()
      throw failure
    }
    return file
  }

  private fun resolveTypeface(font: String, bold: Boolean): Typeface {
    if (font.isEmpty()) return if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    typefaces[font]?.let { return it }
    return try {
      val file = materialize(font, "ttf")
      val face = typefaces[file.absolutePath] ?: Typeface.createFromFile(file).also {
        typefaces[file.absolutePath] = it
      }
      typefaces[font] = face
      face
    } catch (error: Throwable) {
      if (warnedFonts.add(font)) {
        Log.w(TAG, "Falling back to system typeface for $font", error)
      }
      if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    }
  }

  private fun rect(op: JSONObject): RectF {
    val x = op.getDouble("x").toFloat()
    val y = op.getDouble("y").toFloat()
    scratchRect.set(x, y, x + op.getDouble("width").toFloat(), y + op.getDouble("height").toFloat())
    return scratchRect
  }

  private fun drawOps(canvas: Canvas, ops: JSONArray, width: Int) {
    for (index in 0 until ops.length()) {
      val op = ops.getJSONObject(index)
      when (op.getString("op")) {
        "roundRect" -> {
          fillPaint.color = colorOf(op.getString("color"))
          val radius = op.optDouble("radius", 0.0).toFloat()
          canvas.drawRoundRect(rect(op), radius, radius, fillPaint)
        }
        "text" -> {
          val text = op.optString("text")
          if (text.isNotEmpty()) {
            val align = op.optString("align")
            val x = op.getDouble("x").toFloat()
            val y = op.getDouble("y").toFloat()
            val maxWidth = op.optDouble("maxWidth", width.toDouble()).toFloat().coerceAtLeast(0f)
            glyphPaint.color = colorOf(op.optString("color", "#f8fafc"))
            glyphPaint.textSize = op.optDouble("size", 32.0).toFloat()
            glyphPaint.typeface = resolveTypeface(op.optString("font"), op.optBoolean("bold"))
            glyphPaint.textAlign = when (align) {
              "center" -> Paint.Align.CENTER
              "right" -> Paint.Align.RIGHT
              else -> Paint.Align.LEFT
            }
            val shown = TextUtils.ellipsize(text, glyphPaint, maxWidth, TextUtils.TruncateAt.END).toString()
            canvas.drawText(shown, x, y - glyphPaint.ascent(), glyphPaint)
          }
        }
        else -> error("Unknown diagnostics draw operation.")
      }
    }
  }

  private fun poseOf(spec: JSONObject): FloatArray {
    val values = spec.getJSONArray("pose")
    require(values.length() == 7) { "Diagnostics panel pose needs 7 numbers." }
    return FloatArray(7) { index ->
      values.getDouble(index).toFloat().also { require(it.isFinite()) { "Diagnostics pose is not finite." } }
    }
  }

  private fun renderDiag(id: Int, json: String) {
    synchronized(diagDrawLock) {
      if (id != diagOwner) return
      check(available) { "Quest input renderer is not installed." }
      val started = System.nanoTime()
      val spec = JSONObject(json)
      val width = spec.getInt("widthPx")
      val height = spec.getInt("heightPx")
      val widthM = spec.getDouble("widthM").toFloat()
      val heightM = spec.getDouble("heightM").toFloat()
      require(width in 1..4096 && height in 1..4096) { "Diagnostics size is out of range." }
      require(widthM.isFinite() && widthM > 0f && widthM <= 2f) { "Diagnostics width is out of range." }
      require(heightM.isFinite() && heightM > 0f && heightM <= 2f) { "Diagnostics height is out of range." }
      val pose = poseOf(spec)
      val ops = spec.getJSONArray("ops")
      require(ops.length() in 1..200) { "Diagnostics panel op count out of range." }
      val pixelsKey = "$width:$height:$widthM:$heightM:$ops"
      if (pixelsKey == drawnDiagPixelsKey) {
        check(nativeDiagPose(pose)) { "The renderer rejected the diagnostics pose." }
        return
      }
      if (diagBitmap?.width != width || diagBitmap?.height != height) {
        releaseDiagRaster()
        diagBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        diagPixels = ByteArray(diagBitmap!!.byteCount)
      }
      val bitmap = diagBitmap!!
      val pixels = diagPixels!!
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
      drawOps(canvas, ops, width)
      val drawn = System.nanoTime()
      val buffer = ByteBuffer.wrap(pixels)
      buffer.rewind()
      bitmap.copyPixelsToBuffer(buffer)
      check(nativeDiagDraw(pixels, width, height, widthM, heightM, pose)) {
        "The renderer rejected the diagnostics panel."
      }
      drawnDiagPixelsKey = pixelsKey
      val end = System.nanoTime()
      Log.i(
        TAG,
        "diag full ${width}x$height ops=${ops.length()} " +
          "canvas=${(drawn - started) / 1_000_000.0}ms total=${(end - started) / 1_000_000.0}ms"
      )
    }
  }

  private fun renderDiagPatch(id: Int, json: String) {
    synchronized(diagDrawLock) {
      if (id != diagOwner || !available) return
      val fullBitmap = diagBitmap ?: return
      val fullW = fullBitmap.width
      val fullH = fullBitmap.height
      if (fullW <= 0 || fullH <= 0) return

      val started = System.nanoTime()
      val root = JSONObject(json)
      val regions = root.getJSONArray("regions")
      var canvasTotalNs = 0L
      var bytesTotal = 0L
      val fullCanvas = Canvas(fullBitmap)

      for (i in 0 until regions.length()) {
        val reg = regions.getJSONObject(i)
        val rx = reg.getInt("x")
        val ry = reg.getInt("y")
        val rw = reg.getInt("width")
        val rh = reg.getInt("height")
        if (rx < 0 || ry < 0 || rw <= 0 || rh <= 0 || rx + rw > fullW || ry + rh > fullH) continue
        val clearHex = reg.optString("clearColor", "#131f38")
        val ops = reg.getJSONArray("ops")
        val key = (rw.toLong() shl 32) or (rh.toLong() and 0xffffffffL)
        val (regBitmap, regBytes) = patchScratch.getOrPut(key) {
          val bmp = Bitmap.createBitmap(rw, rh, Bitmap.Config.ARGB_8888)
          bmp to ByteArray(bmp.byteCount)
        }
        val t0 = System.nanoTime()
        val c = Canvas(regBitmap)
        c.drawColor(colorOf(clearHex))
        c.save()
        c.translate(-rx.toFloat(), -ry.toFloat())
        drawOps(c, ops, fullW)
        c.restore()
        canvasTotalNs += System.nanoTime() - t0

        val buf = ByteBuffer.wrap(regBytes)
        buf.rewind()
        regBitmap.copyPixelsToBuffer(buf)
        fullCanvas.drawBitmap(regBitmap, rx.toFloat(), ry.toFloat(), null)
        nativeDiagDrawRegion(regBytes, rx, ry, rw, rh)
        bytesTotal += regBytes.size.toLong()
      }

      val now = System.nanoTime()
      if (perfWindowStartNs == 0L) perfWindowStartNs = now
      perfPatchCount += 1
      perfCanvasNs += canvasTotalNs
      perfTotalNs += now - started
      perfBytes += bytesTotal
      val windowNs = now - perfWindowStartNs
      if (windowNs >= 2_000_000_000L && perfPatchCount > 0) {
        val hz = perfPatchCount * 1e9 / windowNs
        val avgCanvasMs = perfCanvasNs / (perfPatchCount * 1e6)
        val avgTotalMs = perfTotalNs / (perfPatchCount * 1e6)
        val avgKb = perfBytes / (perfPatchCount * 1024.0)
        Log.i(
          TAG,
          String.format(
            "diag patch hz=%.1f count=%d avgCanvas=%.2fms avgTotal=%.2fms avgKB=%.0f",
            hz, perfPatchCount, avgCanvasMs, avgTotalMs, avgKb
          )
        )
        perfWindowStartNs = now
        perfPatchCount = 0
        perfCanvasNs = 0L
        perfTotalNs = 0L
        perfBytes = 0L
      }
    }
  }

  private fun runDiagWorker() {
    synchronized(diagQueueLock) {
      if (diagDrawRunning) return
      diagDrawRunning = true
    }
    diagExecutor.execute {
      while (true) {
        var nextDraw: Pair<Int, String>? = null
        var nextPatch: Pair<Int, String>? = null
        synchronized(diagQueueLock) {
          if (pendingDiagDraw != null) {
            nextDraw = pendingDiagDraw
            pendingDiagDraw = null
          } else if (pendingDiagPatch != null) {
            nextPatch = pendingDiagPatch
            pendingDiagPatch = null
          } else {
            diagDrawRunning = false
          }
        }
        if (nextDraw == null && nextPatch == null) break
        try {
          if (nextDraw != null) renderDiag(nextDraw!!.first, nextDraw!!.second)
          else if (nextPatch != null) renderDiagPatch(nextPatch!!.first, nextPatch!!.second)
        } catch (error: Throwable) {
          val failedOwner = nextDraw?.first ?: nextPatch?.first
          if (failedOwner == diagOwner) diagDrawFailed = true
          Log.e(TAG, "Diagnostics panel draw failed", error)
          synchronized(diagQueueLock) {
            pendingDiagDraw = null
            pendingDiagPatch = null
            diagDrawRunning = false
          }
          break
        }
      }
    }
  }

  private fun enqueueDiagDraw(id: Int, json: String) {
    synchronized(diagQueueLock) {
      pendingDiagDraw = id to json
    }
    runDiagWorker()
  }

  private fun enqueueDiagPatch(id: Int, json: String) {
    synchronized(diagQueueLock) {
      pendingDiagPatch = id to json
    }
    runDiagWorker()
  }

  override fun definition() = ModuleDefinition {
    Name("QuestInput")

    Function("isAvailable") { available }

    Function("setMarkersEnabled") { enabled: Boolean ->
      if (!available) return@Function false
      nativeSetMarkersEnabled(enabled)
      true
    }

    Function("read") { afterSeq: Double -> read(afterSeq) }

    // Bound OpenXR interaction profile per hand, left then right; empty until bound.
    Function("profiles") {
      if (available) listOf(nativeProfile(0), nativeProfile(1)) else listOf("", "")
    }

    Function("openDiagnostics") {
      synchronized(diagDrawLock) {
        check(available) { "Quest input renderer is not installed." }
        nativeDiagHide()
        diagDrawFailed = false
        drawnDiagPixelsKey = null
        ++diagOwner
      }
    }

    Function("statusDiagnostics") { id: Int ->
      if (id == diagOwner && !diagDrawFailed && available) nativeDiagStatus() else -1
    }

    Function("drawDiagnostics") { id: Int, json: String ->
      if (id == diagOwner) enqueueDiagDraw(id, json)
    }

    Function("patchDiagnostics") { id: Int, json: String ->
      if (id == diagOwner) enqueueDiagPatch(id, json)
    }

    Function("hideDiagnostics") { id: Int ->
      synchronized(diagDrawLock) {
        if (id == diagOwner) {
          ++diagOwner
          if (available) nativeDiagHide()
          releaseDiagRaster()
        }
      }
    }

    OnDestroy {
      if (available) nativeSetMarkersEnabled(false)
      synchronized(diagDrawLock) {
        ++diagOwner
        if (available) nativeDiagHide()
        releaseDiagRaster()
      }
      diagExecutor.shutdown()
    }
  }
}
