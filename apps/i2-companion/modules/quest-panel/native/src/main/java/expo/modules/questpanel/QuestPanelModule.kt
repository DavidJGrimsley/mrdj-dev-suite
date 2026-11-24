package expo.modules.questpanel

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
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
import java.security.MessageDigest
import java.util.concurrent.Executors

private const val TAG = "QuestPanel"

// Matches quest_panel::kVersion in tools/quest/viro-renderer/0004-openxr-quest-cockpit-slots.patch.
private const val NATIVE_VERSION = 5
private const val MAX_WINDOW_SLOTS = 16
private const val OVERLAY_SLOT_INDEX = 16
private const val MAX_OPS_PER_WINDOW = 2048

class QuestPanelModule : Module() {
  private val drawExecutor = Executors.newFixedThreadPool(2)
  private val assetLock = Any()
  private val typefaces = HashMap<String, Typeface>()
  private val bitmaps = HashMap<String, Bitmap>()
  private val colorCache = HashMap<String, Int>()

  private external fun nativeVersion(): Int
  private external fun nativeRefSpaceEpoch(): Int
  private external fun nativeCapabilitiesJson(): String
  private external fun nativeDiagnosticsJson(): String
  private external fun nativeSetDiagnosticsEnabled(enabled: Boolean)
  private external fun nativeSlotStatus(slot: Int): Int
  private external fun nativeSlotHide(slot: Int)
  private external fun nativeSlotPose(slot: Int, pose: FloatArray): Boolean
  private external fun nativeSlotPoseAndSize(
    slot: Int,
    widthM: Float,
    heightM: Float,
    pose: FloatArray,
    nodeTag: String?
  ): Boolean
  private external fun nativeSlotDrawBitmap(
    slot: Int,
    bitmap: Bitmap,
    contentW: Int,
    contentH: Int,
    bucketW: Int,
    bucketH: Int,
    widthM: Float,
    heightM: Float,
    pose: FloatArray,
    nodeTag: String?
  ): Boolean
  private external fun nativeSlotDraw(
    slot: Int,
    rgba: ByteArray,
    width: Int,
    height: Int,
    widthM: Float,
    heightM: Float,
    pose: FloatArray
  ): Boolean

  private val available: Boolean by lazy {
    try {
      System.loadLibrary("viro_renderer")
      nativeVersion() == NATIVE_VERSION
    } catch (_: LinkageError) {
      false
    }
  }

  private inner class PanelSlot(
    private val slotIndex: Int,
    private val slotName: String
  ) {
    @Volatile var owner = 0
    @Volatile var drawFailed = false
    private val drawLock = Any()
    private val queueLock = Any()
    private var pendingDraw: Pair<Int, String>? = null
    private var drawRunning = false

    private var panelBitmap: Bitmap? = null
    private var drawnPixelsKey: String? = null

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val glyphPaint = TextPaint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)

    fun open(): Int {
      val id = synchronized(queueLock) {
        pendingDraw = null
        drawFailed = false
        drawnPixelsKey = null
        ++owner
      }
      if (available) nativeSlotHide(slotIndex)
      return id
    }

    fun status(id: Int): Int {
      if (id <= 0 || id != owner || drawFailed) return -1
      return if (available) nativeSlotStatus(slotIndex) else 0
    }

    fun hide(id: Int) {
      if (id > 0 && id == owner) {
        hideUnconditional()
      }
    }

    fun hideUnconditional() {
      synchronized(queueLock) {
        pendingDraw = null
        drawFailed = false
        drawnPixelsKey = null
        ++owner
      }
      if (available) nativeSlotHide(slotIndex)
      synchronized(drawLock) { releaseRaster() }
    }

    fun poseOnly(id: Int, widthM: Float?, heightM: Float?, pose: FloatArray, nodeTag: String?) {
      if (id <= 0 || id != owner || !available) return
      if (pose.size == 7 && pose.all { it.isFinite() }) {
        nativeSlotPoseAndSize(
          slotIndex,
          widthM ?: -1f,
          heightM ?: -1f,
          pose,
          nodeTag
        )
      }
    }

    fun destroy() {
      synchronized(queueLock) {
        pendingDraw = null
        ++owner
      }
      if (available) nativeSlotHide(slotIndex)
      synchronized(drawLock) { releaseRaster() }
    }

    private fun releaseRaster() {
      panelBitmap?.recycle()
      panelBitmap = null
      drawnPixelsKey = null
    }

    fun enqueueDraw(id: Int, json: String) {
      if (id <= 0 || id != owner) return
      synchronized(queueLock) {
        if (id != owner) return
        drawFailed = false
        pendingDraw = id to json
        if (drawRunning) return
        drawRunning = true
      }
      drawExecutor.execute {
        while (true) {
          val next = synchronized(queueLock) {
            val value = pendingDraw
            pendingDraw = null
            if (value == null) drawRunning = false
            value
          } ?: break
          try {
            synchronized(drawLock) { renderOwned(next.first, next.second) }
          } catch (error: Throwable) {
            if (next.first == owner) drawFailed = true
            Log.e(TAG, "$slotName draw failed", error)
          }
        }
      }
    }

    private fun renderOwned(id: Int, json: String) {
      if (id != owner) return
      check(available) { "Quest compositor renderer is not installed." }
      val spec = JSONObject(json)
      val contentW = spec.getInt("widthPx")
      val contentH = spec.getInt("heightPx")
      val bucketW = spec.optInt("bucketWidthPx", contentW).coerceAtLeast(contentW)
      val bucketH = spec.optInt("bucketHeightPx", contentH).coerceAtLeast(contentH)
      val widthM = spec.getDouble("widthM").toFloat()
      val heightM = spec.getDouble("heightM").toFloat()
      val nodeTag = spec.optString("nodeTag", "").takeIf { it.isNotEmpty() }
      require(contentW in 1..4096 && contentH in 1..4096) { "Window pixel size out of range." }
      require(bucketW in contentW..4096 && bucketH in contentH..4096) { "Bucket size out of range." }
      require(widthM.isFinite() && widthM > 0.05f && widthM <= 4.0f) { "Window widthM out of range." }
      require(heightM.isFinite() && heightM > 0.05f && heightM <= 4.0f) { "Window heightM out of range." }
      val pose = poseOf(spec)

      val ops = spec.optJSONArray("ops")
      val wingTiles = spec.optJSONArray("wingTiles")
      val opsKey = when {
        ops != null -> {
          require(ops.length() in 1..MAX_OPS_PER_WINDOW) { "Window ops length out of range." }
          "ops:$ops"
        }
        wingTiles != null -> "tiles:$wingTiles"
        else -> error("Window spec requires ops.")
      }

      // Exclude pose, widthM, heightM from pixelsKey so moving/resizing never re-rasterizes identical pixels.
      val pixelsKey = "$contentW:$contentH:$bucketW:$bucketH:$opsKey"
      if (pixelsKey == drawnPixelsKey) {
        check(nativeSlotPoseAndSize(slotIndex, widthM, heightM, pose, nodeTag)) {
          "Renderer rejected $slotName pose."
        }
        return
      }

      // Allocate/reuse Bitmap of exact contentW x contentH (or shrink if needed).
      if (panelBitmap == null || panelBitmap!!.width != contentW || panelBitmap!!.height != contentH) {
        panelBitmap?.recycle()
        panelBitmap = Bitmap.createBitmap(contentW, contentH, Bitmap.Config.ARGB_8888)
      }
      val bitmap = panelBitmap!!
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
      if (ops != null) {
        drawOps(canvas, ops, contentW)
      } else if (wingTiles != null) {
        drawWingTiles(canvas, wingTiles, contentW)
      }

      check(
        nativeSlotDrawBitmap(
          slotIndex,
          bitmap,
          contentW,
          contentH,
          bucketW,
          bucketH,
          widthM,
          heightM,
          pose,
          nodeTag
        )
      ) {
        "Renderer rejected $slotName bitmap."
      }
      drawnPixelsKey = pixelsKey
    }

    private fun drawOps(canvas: Canvas, ops: JSONArray, width: Int) {
      for (index in 0 until ops.length()) {
        val op = ops.getJSONObject(index)
        when (op.getString("op")) {
          "roundRect" -> {
            fillPaint.shader = buildShader(op)
            fillPaint.color = if (fillPaint.shader == null) colorOf(op.optString("color", "#00000000")) else Color.WHITE
            val radius = op.optDouble("radius", 0.0).toFloat()
            canvas.drawRoundRect(rect(op), radius, radius, fillPaint)
            fillPaint.shader = null
          }
          "rect" -> {
            fillPaint.shader = buildShader(op)
            fillPaint.color = if (fillPaint.shader == null) colorOf(op.optString("color", "#00000000")) else Color.WHITE
            canvas.drawRect(rect(op), fillPaint)
            fillPaint.shader = null
          }
          "strokeRect" -> {
            strokePaint.color = colorOf(op.getString("color"))
            strokePaint.strokeWidth = op.optDouble("strokeWidth", 3.0).toFloat()
            val radius = op.optDouble("radius", 0.0).toFloat()
            canvas.drawRoundRect(rect(op), radius, radius, strokePaint)
          }
          "circle" -> {
            fillPaint.shader = buildShader(op)
            fillPaint.color = if (fillPaint.shader == null) colorOf(op.optString("color", "#00000000")) else Color.WHITE
            canvas.drawCircle(
              op.getDouble("cx").toFloat(),
              op.getDouble("cy").toFloat(),
              op.getDouble("r").toFloat(),
              fillPaint
            )
            fillPaint.shader = null
          }
          "line" -> {
            linePaint.color = colorOf(op.getString("color"))
            linePaint.strokeWidth = op.optDouble("strokeWidth", 2.0).toFloat()
            canvas.drawLine(
              op.getDouble("x1").toFloat(),
              op.getDouble("y1").toFloat(),
              op.getDouble("x2").toFloat(),
              op.getDouble("y2").toFloat(),
              linePaint
            )
          }
          "polyline" -> {
            val pts = op.optJSONArray("points")
            if (pts != null && pts.length() >= 4) {
              val path = Path()
              path.moveTo(pts.getDouble(0).toFloat(), pts.getDouble(1).toFloat())
              var i = 2
              while (i + 1 < pts.length()) {
                path.lineTo(pts.getDouble(i).toFloat(), pts.getDouble(i + 1).toFloat())
                i += 2
              }
              if (op.optBoolean("close", false)) path.close()
              val fillHex = op.optString("fillColor", "")
              if (fillHex.isNotEmpty()) {
                fillPaint.color = colorOf(fillHex)
                canvas.drawPath(path, fillPaint)
              }
              val strokeHex = op.optString("color", "")
              if (strokeHex.isNotEmpty()) {
                strokePaint.strokeWidth = op.optDouble("strokeWidth", 2.5).toFloat()
                strokePaint.strokeCap = Paint.Cap.ROUND
                strokePaint.strokeJoin = Paint.Join.ROUND
                strokePaint.color = colorOf(strokeHex)
                canvas.drawPath(path, strokePaint)
              }
            }
          }
          "clipRoundRect" -> {
            canvas.save()
            val radius = op.optDouble("radius", 0.0).toFloat()
            val clipPath = Path().apply {
              addRoundRect(rect(op), radius, radius, Path.Direction.CW)
            }
            canvas.clipPath(clipPath)
          }
          "clipRestore" -> {
            canvas.restore()
          }
          "image" -> {
            val bitmap = resolveBitmap(op.optString("uri"))
            if (bitmap != null) {
              canvas.drawBitmap(bitmap, null, rect(op), imagePaint)
            } else {
              val fallback = op.optString("text")
              if (fallback.isNotEmpty()) {
                val boxW = op.getDouble("width").toFloat()
                val boxH = op.getDouble("height").toFloat()
                val size = op.optDouble("size", (boxH * 0.6).coerceAtLeast(24.0)).toFloat()
                drawTextOp(
                  canvas,
                  text = fallback,
                  x = (op.getDouble("x") + boxW / 2.0).toFloat(),
                  y = (op.getDouble("y") + ((boxH - size) / 2.0).coerceAtLeast(0.0)).toFloat(),
                  size = size,
                  color = op.optString("color", "#f8fafc"),
                  align = "center",
                  bold = true,
                  font = op.optString("font"),
                  maxWidth = op.optDouble("maxWidth", width.toDouble()).toFloat()
                )
              }
            }
          }
          "text" -> {
            drawTextOp(
              canvas,
              text = op.optString("text"),
              x = op.getDouble("x").toFloat(),
              y = op.getDouble("y").toFloat(),
              size = op.optDouble("size", 28.0).toFloat(),
              color = op.optString("color", "#f8fafc"),
              align = op.optString("align"),
              bold = op.optBoolean("bold"),
              font = op.optString("font"),
              maxWidth = op.optDouble("maxWidth", width.toDouble()).toFloat()
            )
          }
          else -> error("Unknown panel draw operation: ${op.optString("op")}")
        }
      }
    }

    private fun drawWingTiles(canvas: Canvas, tiles: JSONArray, canvasWidth: Int) {
      for (i in 0 until tiles.length()) {
        val tile = tiles.getJSONObject(i)
        val x = tile.getDouble("x").toFloat()
        val y = tile.getDouble("y").toFloat()
        val w = tile.getDouble("width").toFloat()
        val h = tile.getDouble("height").toFloat()
        val focused = tile.optBoolean("focused", false)

        fillPaint.color = colorOf(if (focused) "#0f1e2e" else "#0a1420")
        canvas.drawRoundRect(RectF(x, y, x + w, y + h), 20f, 20f, fillPaint)
        strokePaint.strokeWidth = if (focused) 4f else 2f
        strokePaint.color = colorOf(if (focused) "#2dd4bf" else "#1e293b")
        canvas.drawRoundRect(RectF(x, y, x + w, y + h), 20f, 20f, strokePaint)

        drawTextOp(
          canvas,
          tile.optString("title", "Widget"),
          x + 24f,
          y + 20f,
          28f,
          "#5eead4",
          "left",
          true,
          "",
          (w - 48f).coerceAtLeast(100f)
        )
        val lines = tile.optJSONArray("lines")
        if (lines != null) {
          for (li in 0 until minOf(lines.length(), 4)) {
            drawTextOp(
              canvas,
              lines.getString(li),
              x + 24f,
              y + 62f + li * 34f,
              22f,
              "#cbd5e1",
              "left",
              false,
              "",
              (w - 48f).coerceAtLeast(100f)
            )
          }
        }
      }
    }

    private fun drawTextOp(
      canvas: Canvas,
      text: String,
      x: Float,
      y: Float,
      size: Float,
      color: String,
      align: String,
      bold: Boolean,
      font: String,
      maxWidth: Float
    ) {
      if (text.isEmpty()) return
      glyphPaint.color = colorOf(color)
      glyphPaint.textSize = size
      glyphPaint.typeface = resolveTypeface(font, bold)
      glyphPaint.textAlign = when (align) {
        "center" -> Paint.Align.CENTER
        "right" -> Paint.Align.RIGHT
        else -> Paint.Align.LEFT
      }
      val shown = TextUtils.ellipsize(
        text,
        glyphPaint,
        maxWidth.coerceAtLeast(0f),
        TextUtils.TruncateAt.END
      ).toString()
      canvas.drawText(shown, x, y - glyphPaint.ascent(), glyphPaint)
    }
  }

  private val windowSlots = Array(MAX_WINDOW_SLOTS) { index -> PanelSlot(index, "window-$index") }
  private val overlaySlot = PanelSlot(OVERLAY_SLOT_INDEX, "overlay")

  private fun windowSlot(index: Int): PanelSlot {
    require(index in 0 until MAX_WINDOW_SLOTS) { "Window slot out of range: $index" }
    return windowSlots[index]
  }

  private fun slotByName(name: String): PanelSlot = when (name) {
    "focused", "menu" -> windowSlots[0]
    "leftWing" -> windowSlots[1]
    "rightWing" -> windowSlots[2]
    "overlay", "title" -> overlaySlot
    else -> error("Unknown panel slot: $name")
  }

  private fun releaseAssets() {
    synchronized(assetLock) {
      for (bitmap in bitmaps.values) {
        if (!bitmap.isRecycled) bitmap.recycle()
      }
      bitmaps.clear()
      typefaces.clear()
      colorCache.clear()
    }
  }

  private fun colorOf(hex: String): Int {
    synchronized(assetLock) {
      return colorCache.getOrPut(hex) { Color.parseColor(hex) }
    }
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
    val context = appContext.reactContext ?: error("Quest panel has no Android context.")
    val input = openPackaged(context, value) ?: error("Quest panel asset is not a file: $value")
    val directory = File(context.cacheDir, "quest-panel-src")
    if (!directory.isDirectory && !directory.mkdirs()) {
      error("Quest panel cache directory was not created.")
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
          if (copied <= 0L) error("Quest panel asset was empty: $value")
        }
      }
      if (!temp.renameTo(file) && !file.isFile) {
        error("Quest panel asset cache rename failed: $value")
      }
    } catch (failure: Exception) {
      temp.delete()
      throw failure
    }
    return file
  }

  private fun resolveBitmap(uri: String): Bitmap? {
    if (uri.isEmpty()) return null
    synchronized(assetLock) {
      bitmaps[uri]?.let { if (!it.isRecycled) return it }
    }
    return try {
      val file = materialize(uri, "png")
      val options = BitmapFactory.Options().apply { inScaled = false }
      val decoded = BitmapFactory.decodeFile(file.absolutePath, options)
        ?: error("Quest panel image could not be decoded: $uri")
      synchronized(assetLock) { bitmaps[uri] = decoded }
      decoded
    } catch (_: Throwable) {
      null
    }
  }

  private fun buildShader(op: JSONObject): Shader? {
    val grad = op.optJSONObject("gradient") ?: return null
    val rawColors = grad.optJSONArray("colors") ?: return null
    if (rawColors.length() < 2) return null
    val colors = IntArray(rawColors.length()) { i -> colorOf(rawColors.getString(i)) }
    val rawStops = grad.optJSONArray("stops")
    val stops = if (rawStops != null && rawStops.length() == colors.size) {
      FloatArray(colors.size) { i -> rawStops.getDouble(i).toFloat() }
    } else null
    return if (grad.optString("type", "linear") == "radial") {
      RadialGradient(
        grad.optDouble("cx", 0.0).toFloat(),
        grad.optDouble("cy", 0.0).toFloat(),
        grad.optDouble("r", 100.0).toFloat().coerceAtLeast(1f),
        colors,
        stops,
        Shader.TileMode.CLAMP
      )
    } else {
      LinearGradient(
        grad.optDouble("x0", op.optDouble("x", 0.0)).toFloat(),
        grad.optDouble("y0", op.optDouble("y", 0.0)).toFloat(),
        grad.optDouble("x1", op.optDouble("x", 0.0) + op.optDouble("width", 100.0)).toFloat(),
        grad.optDouble("y1", op.optDouble("y", 0.0) + op.optDouble("height", 100.0)).toFloat(),
        colors,
        stops,
        Shader.TileMode.CLAMP
      )
    }
  }

  private fun fontAssetPath(font: String, bold: Boolean): String? = when (font) {
    "SpaceGrotesk-Bold", "Space Grotesk:Bold", "space-grotesk-bold" -> "fonts/SpaceGrotesk-Bold.ttf"
    "SpaceGrotesk-Medium", "SpaceGrotesk-SemiBold", "space-grotesk-medium" -> "fonts/SpaceGrotesk-Medium.ttf"
    "SpaceGrotesk-Regular", "Space Grotesk", "Space Grotesk:Regular", "space-grotesk" ->
      if (bold) "fonts/SpaceGrotesk-Bold.ttf" else "fonts/SpaceGrotesk-Regular.ttf"
    "RoundedMplus1c-Bold", "MPLUSRounded1c-Bold", "rounded-mplus-bold" -> "fonts/MPLUSRounded1c-Bold.ttf"
    "RoundedMplus1c-Medium", "MPLUSRounded1c-Medium", "Rounded Mplus 1c:Medium" -> "fonts/MPLUSRounded1c-Medium.ttf"
    "RoundedMplus1c-Regular", "Rounded Mplus 1c", "MPLUSRounded1c-Regular" ->
      if (bold) "fonts/MPLUSRounded1c-Bold.ttf" else "fonts/MPLUSRounded1c-Regular.ttf"
    else -> null
  }

  private fun registerFontAlias(name: String, uri: String) {
    if (name.isEmpty() || uri.isEmpty()) return
    try {
      val file = materialize(uri, "ttf")
      val face = Typeface.createFromFile(file)
      synchronized(assetLock) {
        typefaces[name] = face
        if (uri != name) typefaces[uri] = face
      }
    } catch (_: Throwable) {
    }
  }

  private fun resolveTypeface(font: String, bold: Boolean): Typeface {
    if (font.isEmpty()) return if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    val cacheKey = if (bold && !font.contains("Bold", ignoreCase = true)) "$font:bold" else font
    synchronized(assetLock) {
      typefaces[cacheKey]?.let { return it }
      typefaces[font]?.let { return it }
    }
    val bundledPath = fontAssetPath(font, bold)
    if (bundledPath != null) {
      try {
        val ctx = appContext.reactContext
        if (ctx != null) {
          val face = Typeface.createFromAsset(ctx.assets, bundledPath)
          synchronized(assetLock) {
            typefaces[cacheKey] = face
          }
          return face
        }
      } catch (_: Throwable) {
      }
    }
    return try {
      val file = materialize(font, "ttf")
      val face = synchronized(assetLock) {
        typefaces[file.absolutePath] ?: Typeface.createFromFile(file).also {
          typefaces[file.absolutePath] = it
        }
      }
      synchronized(assetLock) { typefaces[cacheKey] = face }
      face
    } catch (_: Throwable) {
      if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    }
  }

  private fun rect(op: JSONObject) = RectF(
    op.getDouble("x").toFloat(),
    op.getDouble("y").toFloat(),
    (op.getDouble("x") + op.getDouble("width")).toFloat(),
    (op.getDouble("y") + op.getDouble("height")).toFloat()
  )

  private fun poseOf(spec: JSONObject): FloatArray {
    val values = spec.getJSONArray("pose")
    require(values.length() == 7) { "Panel pose needs 7 numbers." }
    return FloatArray(7) { index ->
      values.getDouble(index).toFloat().also { require(it.isFinite()) { "Panel pose is not finite." } }
    }
  }

  private fun capabilitiesMap(): Map<String, Any?> {
    if (!available) {
      return mapOf(
        "available" to false,
        "version" to 0,
        "poolCapacity" to MAX_WINDOW_SLOTS,
        "maxLayerCount" to 0,
        "maxWindowLayers" to 0,
        "maxSwapchainWidth" to 0,
        "maxSwapchainHeight" to 0,
        "reservedNonWindowLayers" to 0,
        "activeWindowCount" to 0,
        "activeSwapchainCount" to 0,
        "activeSwapchainBytes" to 0.0,
        "memoryBudgetBytes" to (192.0 * 1024.0 * 1024.0),
        "lastEndFrameResult" to 0,
        "lastSwapchainResult" to 0,
        "initialized" to false,
        "systemName" to "Unavailable"
      )
    }
    val raw = JSONObject(nativeCapabilitiesJson())
    val maxLayers = raw.optInt("maxLayerCount", 16)
    val pool = raw.optInt("poolCapacity", MAX_WINDOW_SLOTS)
    val reserved = raw.optInt("reservedNonWindowLayers", 2).coerceAtLeast(2)
    val maxWindowLayers = (maxLayers - reserved).coerceIn(0, pool)
    return mapOf(
      "available" to true,
      "version" to raw.optInt("version", NATIVE_VERSION),
      "poolCapacity" to pool,
      "maxLayerCount" to maxLayers,
      "maxWindowLayers" to maxWindowLayers,
      "maxSwapchainWidth" to raw.optInt("maxSwapchainWidth", 4096),
      "maxSwapchainHeight" to raw.optInt("maxSwapchainHeight", 4096),
      "reservedNonWindowLayers" to reserved,
      "activeWindowCount" to raw.optInt("activeWindowCount", 0),
      "activeSwapchainCount" to raw.optInt("activeSwapchainCount", 0),
      "activeSwapchainBytes" to raw.optDouble("activeSwapchainBytes", 0.0),
      "memoryBudgetBytes" to raw.optDouble("memoryBudgetBytes", 192.0 * 1024.0 * 1024.0),
      "lastEndFrameResult" to raw.optInt("lastEndFrameResult", 0),
      "lastSwapchainResult" to raw.optInt("lastSwapchainResult", 0),
      "sessionGeneration" to raw.optInt("sessionGeneration", 0),
      "initialized" to raw.optBoolean("initialized", false),
      "systemName" to raw.optString("systemName", "OpenXR")
    )
  }

  private fun diagnosticsMap(): Map<String, Any?> {
    if (!available) {
      return mapOf(
        "available" to false,
        "version" to 0,
        "frameNumber" to 0,
        "sessionGeneration" to 0,
        "sessionState" to 0,
        "sessionStateName" to "UNAVAILABLE",
        "focused" to false,
        "endFrameResult" to 0,
        "submittedLayerCount" to 0,
        "activeWindowCount" to 0,
        "activeSwapchainCount" to 0,
        "activeSwapchainBytes" to 0.0,
        "layers" to emptyList<Map<String, Any?>>()
      )
    }
    val raw = JSONObject(nativeDiagnosticsJson())
    val layersArray = raw.optJSONArray("layers") ?: JSONArray()
    val layers = ArrayList<Map<String, Any?>>(layersArray.length())
    for (i in 0 until layersArray.length()) {
      val item = layersArray.getJSONObject(i)
      val poseArr = item.optJSONArray("pose") ?: JSONArray()
      val poseList = ArrayList<Double>(poseArr.length())
      for (p in 0 until poseArr.length()) {
        poseList.add(poseArr.optDouble(p, 0.0))
      }
      layers.add(
        mapOf(
          "slot" to item.optInt("slot", -1),
          "nodeTag" to item.optString("nodeTag", ""),
          "swapchain" to item.optString("swapchain", "0x0"),
          "contentW" to item.optInt("contentW", 0),
          "contentH" to item.optInt("contentH", 0),
          "bucketW" to item.optInt("bucketW", 0),
          "bucketH" to item.optInt("bucketH", 0),
          "widthM" to item.optDouble("widthM", 0.0),
          "heightM" to item.optDouble("heightM", 0.0),
          "pose" to poseList
        )
      )
    }
    return mapOf(
      "available" to true,
      "version" to raw.optInt("version", NATIVE_VERSION),
      "frameNumber" to raw.optInt("frameNumber", 0),
      "sessionGeneration" to raw.optInt("sessionGeneration", 0),
      "sessionState" to raw.optInt("sessionState", 0),
      "sessionStateName" to raw.optString("sessionStateName", "UNKNOWN"),
      "focused" to raw.optBoolean("focused", false),
      "endFrameResult" to raw.optInt("endFrameResult", 0),
      "submittedLayerCount" to raw.optInt("submittedLayerCount", 0),
      "activeWindowCount" to raw.optInt("activeWindowCount", 0),
      "activeSwapchainCount" to raw.optInt("activeSwapchainCount", 0),
      "activeSwapchainBytes" to raw.optDouble("activeSwapchainBytes", 0.0),
      "layers" to layers
    )
  }

  override fun definition() = ModuleDefinition {
    Name("QuestPanel")

    Function("isAvailable") { available }
    Function("refSpaceEpoch") { if (available) nativeRefSpaceEpoch() else 0 }
    Function("getCapabilities") { capabilitiesMap() }
    Function("getDiagnostics") { diagnosticsMap() }
    Function("setDiagnosticsEnabled") { enabled: Boolean ->
      if (available) nativeSetDiagnosticsEnabled(enabled)
    }
    Function("registerFont") { name: String, uri: String ->
      registerFontAlias(name, uri)
    }

    // Dynamic multi-window compositor API (slots 0..15)
    Function("openWindow") { slotIndex: Int -> windowSlot(slotIndex).open() }
    Function("statusWindow") { slotIndex: Int, id: Int -> windowSlot(slotIndex).status(id) }
    Function("drawWindow") { slotIndex: Int, id: Int, json: String ->
      windowSlot(slotIndex).enqueueDraw(id, json)
    }
    Function("poseWindow") {
      slotIndex: Int,
      id: Int,
      widthM: Double,
      heightM: Double,
      pose: List<Double>,
      nodeTag: String? ->
      windowSlot(slotIndex).poseOnly(
        id,
        widthM.toFloat(),
        heightM.toFloat(),
        pose.map { it.toFloat() }.toFloatArray(),
        nodeTag
      )
    }
    Function("hideWindow") { slotIndex: Int, id: Int -> windowSlot(slotIndex).hide(id) }
    Function("hideAllWindows") {
      for (slot in windowSlots) slot.hideUnconditional()
      overlaySlot.hideUnconditional()
    }

    // Dedicated Overlay slot (slot 16)
    Function("openOverlay") { overlaySlot.open() }
    Function("statusOverlay") { id: Int -> overlaySlot.status(id) }
    Function("drawOverlay") { id: Int, json: String -> overlaySlot.enqueueDraw(id, json) }
    Function("hideOverlay") { id: Int -> overlaySlot.hide(id) }

    // Legacy slot API preserved for compatibility
    Function("open") { windowSlots[0].open() }
    Function("status") { id: Int -> windowSlots[0].status(id) }
    Function("draw") { id: Int, json: String -> windowSlots[0].enqueueDraw(id, json) }
    Function("hide") { id: Int -> windowSlots[0].hide(id) }

    Function("openTitle") { overlaySlot.open() }
    Function("statusTitle") { id: Int -> overlaySlot.status(id) }
    Function("drawTitle") { id: Int, json: String -> overlaySlot.enqueueDraw(id, json) }
    Function("hideTitle") { id: Int -> overlaySlot.hide(id) }

    Function("openSlot") { slotName: String -> slotByName(slotName).open() }
    Function("statusSlot") { slotName: String, id: Int -> slotByName(slotName).status(id) }
    Function("drawSlot") { slotName: String, id: Int, json: String ->
      slotByName(slotName).enqueueDraw(id, json)
    }
    Function("poseSlot") { slotName: String, id: Int, pose: List<Double> ->
      slotByName(slotName).poseOnly(id, null, null, pose.map { it.toFloat() }.toFloatArray(), null)
    }
    Function("hideSlot") { slotName: String, id: Int -> slotByName(slotName).hide(id) }
    Function("hideAllSlots") {
      for (slot in windowSlots) slot.hideUnconditional()
      overlaySlot.hideUnconditional()
    }

    OnDestroy {
      for (slot in windowSlots) slot.destroy()
      overlaySlot.destroy()
      releaseAssets()
      drawExecutor.shutdown()
    }
  }
}
