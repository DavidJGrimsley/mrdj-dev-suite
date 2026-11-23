package com.mrdj.i2companion

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.meta.spatial.core.Color4
import com.meta.spatial.core.Entity
import com.meta.spatial.core.Pose
import com.meta.spatial.core.Quaternion
import com.meta.spatial.core.Query
import com.meta.spatial.core.SpatialFeature
import com.meta.spatial.core.SystemBase
import com.meta.spatial.core.SystemDependencies
import com.meta.spatial.core.SystemDependencyConfig
import com.meta.spatial.core.Vector3
import com.meta.spatial.isdk.IsdkBoxCollider
import com.meta.spatial.isdk.IsdkGrabConstraints
import com.meta.spatial.isdk.IsdkGrabMovementType
import com.meta.spatial.isdk.IsdkGrabProxy
import com.meta.spatial.isdk.IsdkGrabState
import com.meta.spatial.isdk.IsdkGrabbable
import com.meta.spatial.isdk.IsdkSystem
import com.meta.spatial.runtime.ButtonBits
import com.meta.spatial.runtime.HitInfo
import com.meta.spatial.runtime.PanelDisplayBase
import com.meta.spatial.runtime.PanelSceneObject
import com.meta.spatial.runtime.PanelShapeLayerBlendType
import com.meta.spatial.runtime.ReferenceSpace
import com.meta.spatial.toolkit.Animated
import com.meta.spatial.toolkit.AppSystemActivity
import com.meta.spatial.toolkit.Box
import com.meta.spatial.toolkit.Controller
import com.meta.spatial.toolkit.ControllerType
import com.meta.spatial.toolkit.DpPerMeterDisplayOptions
import com.meta.spatial.toolkit.Material
import com.meta.spatial.toolkit.Mesh
import com.meta.spatial.toolkit.MeshCollision
import com.meta.spatial.toolkit.Panel
import com.meta.spatial.toolkit.PanelInputOptions
import com.meta.spatial.toolkit.PanelRegistration
import com.meta.spatial.toolkit.PanelRenderMode
import com.meta.spatial.toolkit.PanelStyleOptions
import com.meta.spatial.toolkit.PlaybackState
import com.meta.spatial.toolkit.PlaybackType
import com.meta.spatial.toolkit.QuadShapeOptions
import com.meta.spatial.toolkit.RoundedBox
import com.meta.spatial.toolkit.Scale
import com.meta.spatial.toolkit.TickDataModelSystem
import com.meta.spatial.toolkit.TickTransformSystem
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.TransformParent
import com.meta.spatial.toolkit.UIPanelRenderOptions
import com.meta.spatial.toolkit.UIPanelSettings
import com.meta.spatial.toolkit.ViewPanelRegistration
import com.meta.spatial.vr.VRFeature
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Gate 1 Quest-only Android immersive proof activity built on Meta Spatial SDK 0.15.0
 * with one exclusive runtime/session:
 * - Standard live Android WebView UI via ViewPanelRegistration and PanelRenderMode.Layer.
 *   The layer is OPAQUE with feathering off, zIndex 1, and an opaque #0B131D page so the
 *   compositor quad is not an unpunched transparent underlay.
 * - Real desktop fonts (Space Grotesk + Rounded Mplus 1c), clickable DOM button,
 *   and editable DOM <input type="text"> with platform/spatial keyboard support.
 * - Separated small Mist GLB (~24.0 cm max width at ~1.40 m distance) with no visible
 *   wrapper and no collider in the space around Infie (MeshCollision.NoCollision).
 * - Thin white dock-adjacent grab pill below the panel with a generous dedicated
 *   IsdkBoxCollider outside all clickable DOM bounds and an inert gap. Grip still moves
 *   the upright workspaceRoot via IsdkGrabProxy. Pointing at that same volume and holding
 *   trigger, A, or X drags the root along the controller ray without snapping or clicking.
 */
class HomeProofSpatialActivity : AppSystemActivity() {

  companion object {
    private const val TAG = "I2HomeProof"

    // Workspace placement: 1.40 m in front of the viewer in Spatial SDK's
    // left-handed space (+X right, +Y up, +Z forward). The panel is visible
    // from its +Z face, so that face must point back at the viewer.
    private const val WORKSPACE_DISTANCE_M = 1.40f
    private const val DEFAULT_EYE_HEIGHT_M = 1.35f
    private const val PANEL_BELOW_EYE_M = 0.04f
    // nativeGetViewerPose returns the identity pose (y == 0) until head tracking is valid.
    private const val MIN_TRACKED_EYE_HEIGHT_M = 0.25f

    // Live WebView Layer Panel dimensions: 0.68 m x 0.44 m
    // Local bounds under workspaceRoot: x in [-0.34, +0.34], y in [-0.22, +0.22]
    private const val PANEL_WIDTH_M = 0.68f
    private const val PANEL_HEIGHT_M = 0.44f
    private const val PANEL_DP_PER_M = 760f
    private const val PANEL_RESOLUTION_SCALE = 1.25f

    // infie-mist.glb unscaled X width = 4.35627 units.
    // 4.35627 * 0.0551 = 0.24003 m (24.0 cm max width).
    // Local Y = +0.40 m places Mist bottom wisps (~-0.095 m from origin) at y = +0.305 m,
    // leaving an 8.5 cm inert gap above the panel's top edge (y = +0.220 m).
    private const val MIST_SCALE = 0.0551f
    private const val MIST_LOCAL_X_M = -0.18f
    private const val MIST_LOCAL_Y_M = 0.40f
    private const val MIST_LOCAL_Z_M = 0.00f

    // Thin white dock-adjacent grab pill at local Y = -0.31 m (9.0 cm below panel bottom edge y = -0.220 m).
    // Visual pill: 26 cm wide x 1.4 cm tall x 1.0 cm deep.
    // Dedicated IsdkBoxCollider(size, offset): 40 cm wide x 7.0 cm tall x 7.0 cm deep (y in [-0.345, -0.275]),
    // leaving a 5.5 cm inert gap below the panel bottom edge (y = -0.220 m).
    private const val GRAB_PILL_LOCAL_Y_M = -0.31f
    private const val GRAB_PILL_HALF_WIDTH_M = 0.13f
    private const val GRAB_PILL_HALF_HEIGHT_M = 0.007f
    private const val GRAB_PILL_HALF_DEPTH_M = 0.005f

    private const val GRAB_COLLIDER_WIDTH_M = 0.40f
    private const val GRAB_COLLIDER_HEIGHT_M = 0.07f
    private const val GRAB_COLLIDER_DEPTH_M = 0.07f

    // Compositor overlay. UIPanelRenderOptions writes zIndex 0, and PanelShape.createLayer
    // skips setZIndex when the value is 0, leaving the native default sort. Positive 1 is
    // in front of the eye buffer. Hole punching still covers the underlay path.
    private const val PANEL_LAYER_Z_INDEX = 1
    private const val RAY_LENGTH_M = 8.0f
    // A press that barely moves the workspace is a tap, not a drag.
    private const val RAY_TAP_EPSILON_M = 0.01f
  }

  private val panelBackgroundColor = Color.rgb(0x0B, 0x13, 0x1D)

  private var workspaceRootEntity: Entity? = null
  private var panelEntity: Entity? = null
  private var mistEntity: Entity? = null
  private var grabPillEntity: Entity? = null
  private var grabHitEntity: Entity? = null
  private var proofPanelSceneObject: PanelSceneObject? = null
  private var panelLayerConfigured = false
  private var proofWebView: WebView? = null
  private var hasAlignedToInitialViewerPose = false
  private var loggedUntrackedViewerPose = false
  private var rayDrag: RayDrag? = null

  private val breadcrumbEvents = JSONArray()
  private var buttonClickCount = 0
  private var grabCount = 0
  private var rayGrabCount = 0
  private var lastSubmittedText: String = ""
  private var lastInputText: String = ""

  override fun registerSystemFeatures(): List<SpatialFeature> {
    return super.registerSystemFeatures() + listOf(VRFeature(this))
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    systemManager.registerSystem(UprightWorkspaceSystem())
    recordBreadcrumb(
      event = "activity_on_create",
      details = JSONObject()
        .put("packageName", packageName)
        .put("spatialSdkVersion", "0.15.0")
        .put("exclusiveRuntime", true)
        .put("viroLoaded", false),
    )
  }

  override fun registerPanels(): List<PanelRegistration> {
    return listOf(
      ViewPanelRegistration(
        registrationId = R.id.home_proof_webview_panel,
        dynamicViewCreator = { _, context -> createProofWebView(context) },
        settingsCreator = { _ ->
          UIPanelSettings(
            shape = QuadShapeOptions(width = PANEL_WIDTH_M, height = PANEL_HEIGHT_M),
            display = DpPerMeterDisplayOptions(
              dpPerMeter = PANEL_DP_PER_M,
              resolutionScale = PANEL_RESOLUTION_SCALE,
            ),
            rendering = UIPanelRenderOptions(
              renderMode = PanelRenderMode.Layer(
                layerBlendType = PanelShapeLayerBlendType.OPAQUE,
                enableLayerFeatheredEdge = false,
              ),
            ),
            style = PanelStyleOptions(com.meta.spatial.toolkit.R.style.SpatialSDKTransparentTheme),
            input = PanelInputOptions(),
          )
        },
        panelSetupWithRootView = { rootView, panelSceneObject, entity ->
          proofPanelSceneObject = panelSceneObject
          rootView.setBackgroundColor(panelBackgroundColor)
          panelSceneObject.display?.presentation?.window?.setBackgroundDrawable(
            ColorDrawable(panelBackgroundColor),
          )
          // PanelDisplayBase.dispatchEvent drops touch events whenever imm?.isAcceptingText == true.
          // Because Chromium WebView keeps an active InputConnection while an <input> is focused,
          // clearing PanelDisplayBase.imm ensures controller clicks continue reaching the WebView
          // while the text field is focused.
          var immGuardCleared = false
          try {
            val display = panelSceneObject.display
            if (display != null) {
              val immField = PanelDisplayBase::class.java.getDeclaredField("imm")
              immField.isAccessible = true
              immField.set(display, null)
              immGuardCleared = true
            }
          } catch (t: Throwable) {
            Log.w(TAG, "Unable to clear PanelDisplayBase.imm field", t)
          }

          val layerZIndexApplied = applyPanelLayerZIndex(panelSceneObject)
          recordBreadcrumb(
            event = "panel_setup_complete",
            details = JSONObject()
              .put("entityId", entity.id)
              .put("widthMeters", PANEL_WIDTH_M)
              .put("heightMeters", PANEL_HEIGHT_M)
              .put("dpPerMeter", PANEL_DP_PER_M)
              .put("renderMode", "Layer(OPAQUE)")
              .put("layerFeather", false)
              .put("layerZIndex", if (layerZIndexApplied) PANEL_LAYER_Z_INDEX else JSONObject.NULL)
              .put("background", "#0B131D")
              .put("immGuardCleared", immGuardCleared),
          )
        },
      ),
    )
  }

  override fun onSceneReady() {
    super.onSceneReady()

    // STAGE (the SDK default) is the guardian center. A panel placed from an
    // untracked (0,0,0) pose then sits at the room center instead of in front
    // of the headset. LOCAL_FLOOR puts the origin on the floor under the user,
    // with +Z along their forward direction at session start.
    scene.setReferenceSpace(ReferenceSpace.LOCAL_FLOOR)
    // Full-quad hole punch reveals an underlay. zIndex 1 also asks for an overlay.
    scene.enableHolePunching(true)

    scene.setLightingEnvironment(
      ambientColor = Vector3(1.15f, 1.20f, 1.28f),
      sunColor = Vector3(1.65f, 1.65f, 1.65f),
      sunDirection = -Vector3(1.0f, 3.0f, -2.0f),
      environmentIntensity = 1.0f,
    )

    // Visible before head tracking arrives. Yaw 180 points panel +Z back at the user.
    val initialRootPose = Pose(
      Vector3(0f, DEFAULT_EYE_HEIGHT_M - PANEL_BELOW_EYE_M, WORKSPACE_DISTANCE_M),
      Quaternion(0f, 180f, 0f),
    )

    val root = Entity.create(
      Transform(initialRootPose),
      IsdkGrabbable(
        enabled = true,
        movementType = IsdkGrabMovementType.Direct,
        responsiveness = 0.35f,
      ),
      IsdkGrabConstraints(
        lockFlagsValue = IsdkGrabConstraints.LockFlags.SCALE.value,
      ),
    )
    workspaceRootEntity = root

    val panel = Entity.create(
      Panel(R.id.home_proof_webview_panel),
      Transform(Pose(Vector3(0f, 0f, 0f), Quaternion(1f, 0f, 0f, 0f))),
      TransformParent(root),
    )
    panelEntity = panel

    val mist = Entity.create(
      Mesh(
        mesh = Uri.parse("infie/infie-mist.glb"),
        hittable = MeshCollision.NoCollision,
      ),
      Scale(Vector3(MIST_SCALE, MIST_SCALE, MIST_SCALE)),
      Animated(
        startTime = System.currentTimeMillis(),
        playbackState = PlaybackState.PLAYING,
        playbackType = PlaybackType.LOOP,
        track = 0,
      ),
      Transform(
        Pose(
          Vector3(MIST_LOCAL_X_M, MIST_LOCAL_Y_M, MIST_LOCAL_Z_M),
          Quaternion(1f, 0f, 0f, 0f),
        ),
      ),
      TransformParent(root),
    )
    mistEntity = mist

    val pillMaterial = Material().apply {
      baseColor = Color4(1.0f, 1.0f, 1.0f, 0.96f)
      unlit = true
    }

    val grabPill = Entity.create(
      Mesh(
        mesh = RoundedBox.URI,
        hittable = MeshCollision.LineTest,
      ),
      RoundedBox(
        Vector3(-GRAB_PILL_HALF_WIDTH_M, -GRAB_PILL_HALF_HEIGHT_M, -GRAB_PILL_HALF_DEPTH_M),
        Vector3(GRAB_PILL_HALF_WIDTH_M, GRAB_PILL_HALF_HEIGHT_M, GRAB_PILL_HALF_DEPTH_M),
        Vector3(0.007f, 0.007f, 0.004f),
      ),
      pillMaterial,
      IsdkBoxCollider(
        size = Vector3(
          GRAB_COLLIDER_WIDTH_M,
          GRAB_COLLIDER_HEIGHT_M,
          GRAB_COLLIDER_DEPTH_M,
        ),
        offset = Vector3(0f, 0f, 0f),
      ),
      IsdkGrabProxy(grabbable = root),
      Transform(
        Pose(
          Vector3(0f, GRAB_PILL_LOCAL_Y_M, 0f),
          Quaternion(1f, 0f, 0f, 0f),
        ),
      ),
      TransformParent(root),
    )
    grabPillEntity = grabPill

    // Same 40 x 7 x 7 cm volume as the grip collider, but not drawn. LineTest_IgnoreVisible
    // is the SDK ray target. No IsdkGrabbable here: that component suppresses trigger
    // pointer events and would steal panel clicks if it covered the WebView.
    val grabHit = Entity.create(
      Mesh(
        mesh = Box.URI,
        hittable = MeshCollision.LineTest_IgnoreVisible,
      ),
      Box(
        Vector3(
          -GRAB_COLLIDER_WIDTH_M / 2f,
          -GRAB_COLLIDER_HEIGHT_M / 2f,
          -GRAB_COLLIDER_DEPTH_M / 2f,
        ),
        Vector3(
          GRAB_COLLIDER_WIDTH_M / 2f,
          GRAB_COLLIDER_HEIGHT_M / 2f,
          GRAB_COLLIDER_DEPTH_M / 2f,
        ),
      ),
      Material().apply {
        baseColor = Color4(1.0f, 1.0f, 1.0f, 0.0f)
        unlit = true
      },
      Transform(
        Pose(
          Vector3(0f, GRAB_PILL_LOCAL_Y_M, 0f),
          Quaternion(1f, 0f, 0f, 0f),
        ),
      ),
      TransformParent(root),
    )
    grabHitEntity = grabHit

    recordBreadcrumb(
      event = "scene_ready",
      details = JSONObject()
        .put("workspaceRootEntityId", root.id)
        .put("panelEntityId", panel.id)
        .put("mistEntityId", mist.id)
        .put("grabPillEntityId", grabPill.id)
        .put("grabHitEntityId", grabHit.id)
        .put("panelLayerZIndex", PANEL_LAYER_Z_INDEX)
        .put("holePunching", true)
        .put("referenceSpace", "LOCAL_FLOOR")
        .put("workspaceDistanceMeters", WORKSPACE_DISTANCE_M)
        .put("initialFacing", "yaw180_toward_user")
        .put("mistMaxWidthMeters", 0.24f)
        .put("mistScale", MIST_SCALE)
        .put("mistCollision", "NoCollision")
        .put("grabColliderSizeMeters", poseVectorToJson(Vector3(GRAB_COLLIDER_WIDTH_M, GRAB_COLLIDER_HEIGHT_M, GRAB_COLLIDER_DEPTH_M)))
        .put("panelBottomToGrabColliderGapMeters", 0.055f)
        .put("panelTopToMistBottomGapMeters", 0.085f),
    )
  }

  override fun onVRReady() {
    super.onVRReady()
    alignWorkspaceToViewerIfNeeded(trigger = "onVRReady")
  }

  private fun alignWorkspaceToViewerIfNeeded(trigger: String) {
    if (hasAlignedToInitialViewerPose) return
    val root = workspaceRootEntity ?: return
    val viewerPose = scene.getViewerPose()
    // The first ECS tick on this device reported viewerPos (0,0,0). That is the
    // native identity pose, not a worn headset. Committing it pins the workspace
    // to the reference origin. Keep the LOCAL_FLOOR spawn pose until eye height
    // shows the head is tracked.
    if (viewerPose.t.y <= MIN_TRACKED_EYE_HEIGHT_M) {
      if (!loggedUntrackedViewerPose) {
        loggedUntrackedViewerPose = true
        recordBreadcrumb(
          event = "viewer_pose_untracked",
          details = JSONObject()
            .put("trigger", trigger)
            .put("viewerPos", poseVectorToJson(viewerPose.t))
            .put("viewerRot", poseQuaternionToJson(viewerPose.q))
            .put("keptSpawnPose", true),
        )
      }
      return
    }

    val forward = viewerPose.q * Vector3(0f, 0f, 1f)
    val horizLen = sqrt(forward.x * forward.x + forward.z * forward.z)
    if (horizLen < 0.001f) return

    val dirX = forward.x / horizLen
    val dirZ = forward.z / horizLen
    val targetPos = Vector3(
      viewerPose.t.x + dirX * WORKSPACE_DISTANCE_M,
      viewerPose.t.y - PANEL_BELOW_EYE_M,
      viewerPose.t.z + dirZ * WORKSPACE_DISTANCE_M,
    )
    // fromDirection aims object +Z along the vector. Aim +Z back at the viewer
    // so the one-sided WebView layer faces them. The old code aimed +Z along
    // the viewer's look direction, which presents the back of the layer.
    val uprightRot = Quaternion.fromDirection(-dirX, 0f, -dirZ).removePitchAndRoll().normalize()
    root.setComponent(Transform(Pose(targetPos, uprightRot)))
    hasAlignedToInitialViewerPose = true

    recordBreadcrumb(
      event = "workspace_aligned_to_viewer",
      details = JSONObject()
        .put("trigger", trigger)
        .put("viewerPos", poseVectorToJson(viewerPose.t))
        .put("viewerForward", poseVectorToJson(Vector3(dirX, 0f, dirZ)))
        .put("workspacePos", poseVectorToJson(targetPos))
        .put("facing", "toward_viewer")
        .put("distanceMeters", WORKSPACE_DISTANCE_M),
    )
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun createProofWebView(context: Context): WebView {
    val webView = WebView(context).apply {
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      setBackgroundColor(panelBackgroundColor)
      isFocusable = true
      isFocusableInTouchMode = true

      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        allowFileAccess = true
        allowContentAccess = true
        mediaPlaybackRequiresUserGesture = false
        cacheMode = WebSettings.LOAD_NO_CACHE
      }

      addJavascriptInterface(ProofBridge(), "I2HomeProofBridge")

      webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView?, url: String?) {
          super.onPageFinished(view, url)
          view?.setBackgroundColor(panelBackgroundColor)
          recordBreadcrumb(
            event = "webview_page_finished",
            details = JSONObject().put("url", url ?: ""),
          )
        }
      }

      webChromeClient = object : WebChromeClient() {
        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
          if (consoleMessage != null) {
            Log.d(
              TAG,
              "WebViewConsole [${consoleMessage.messageLevel()}]: ${consoleMessage.message()} (${consoleMessage.lineNumber()})",
            )
          }
          return super.onConsoleMessage(consoleMessage)
        }
      }

      loadUrl("file:///android_asset/homeproof/index.html")
    }
    proofWebView = webView
    return webView
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val webView = proofWebView
    if (webView != null) {
      val handled = webView.dispatchKeyEvent(event)
      if (event.action == KeyEvent.ACTION_UP) {
        recordBreadcrumb(
          event = "platform_key_event",
          details = JSONObject()
            .put("keyCode", event.keyCode)
            .put("handledByWebView", handled),
        )
      }
      if (handled) return true
    }
    return super.dispatchKeyEvent(event)
  }

  private fun requestSoftKeyboard() {
    val webView = proofWebView ?: return
    webView.post {
      try {
        webView.requestFocus()
        val imm = webView.context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        val shown = imm?.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT) ?: false
        recordBreadcrumb(
          event = "soft_keyboard_requested",
          details = JSONObject().put("showSoftInputReturned", shown),
        )
      } catch (t: Throwable) {
        Log.w(TAG, "Soft keyboard request failed", t)
      }
    }
  }

  inner class ProofBridge {
    @JavascriptInterface
    fun onDomReady(payloadJson: String) {
      recordBreadcrumb("dom_ready", safeParseJson(payloadJson))
    }

    @JavascriptInterface
    fun onButtonClick(payloadJson: String) {
      val json = safeParseJson(payloadJson)
      buttonClickCount = json.optInt("count", buttonClickCount + 1)
      recordBreadcrumb("dom_button_click", json)
    }

    @JavascriptInterface
    fun onInputFocus(payloadJson: String) {
      recordBreadcrumb("dom_input_focus", safeParseJson(payloadJson))
      requestSoftKeyboard()
    }

    @JavascriptInterface
    fun onRequestSoftKeyboard(payloadJson: String) {
      recordBreadcrumb("dom_request_ime", safeParseJson(payloadJson))
      requestSoftKeyboard()
    }

    @JavascriptInterface
    fun onTextChange(payloadJson: String) {
      val json = safeParseJson(payloadJson)
      lastInputText = json.optString("value", "")
      recordBreadcrumb("dom_text_change", json)
    }

    @JavascriptInterface
    fun onTextSubmit(payloadJson: String) {
      val json = safeParseJson(payloadJson)
      lastSubmittedText = json.optString("value", "")
      recordBreadcrumb("dom_text_submit", json)
    }
  }

  private fun applyPanelLayerZIndex(panelSceneObject: PanelSceneObject): Boolean {
    val layer = panelSceneObject.layer ?: return false
    layer.setZIndex(PANEL_LAYER_Z_INDEX)
    if (!panelLayerConfigured) {
      panelLayerConfigured = true
      recordBreadcrumb(
        event = "panel_layer_configured",
        details = JSONObject()
          .put("zIndex", PANEL_LAYER_Z_INDEX)
          .put("blend", "OPAQUE")
          .put("feather", false)
          .put("holePunching", true),
      )
    }
    return true
  }

  private fun selectMask(): Int {
    return ButtonBits.ButtonTriggerL or
      ButtonBits.ButtonTriggerR or
      ButtonBits.ButtonA or
      ButtonBits.ButtonX
  }

  private fun selectButtonsLabel(mask: Int): String {
    val names = ArrayList<String>(4)
    if ((mask and ButtonBits.ButtonTriggerL) != 0) names.add("triggerL")
    if ((mask and ButtonBits.ButtonTriggerR) != 0) names.add("triggerR")
    if ((mask and ButtonBits.ButtonA) != 0) names.add("A")
    if ((mask and ButtonBits.ButtonX) != 0) names.add("X")
    return if (names.isEmpty()) "none" else names.joinToString("+")
  }

  private fun controllerSelectHeld(controller: Controller): Boolean {
    return controller.isDown(ButtonBits.ButtonTriggerL) ||
      controller.isDown(ButtonBits.ButtonTriggerR) ||
      controller.isDown(ButtonBits.ButtonA) ||
      controller.isDown(ButtonBits.ButtonX)
  }

  private fun controllerSelectPressed(controller: Controller): Boolean {
    return controller.isPressed(ButtonBits.ButtonTriggerL) ||
      controller.isPressed(ButtonBits.ButtonTriggerR) ||
      controller.isPressed(ButtonBits.ButtonA) ||
      controller.isPressed(ButtonBits.ButtonX)
  }

  private fun isGrabVolume(entity: Entity?): Boolean {
    if (entity == null || entity == Entity.nullEntity()) return false
    val pill = grabPillEntity
    val hit = grabHitEntity
    return (pill != null && entity.id == pill.id) || (hit != null && entity.id == hit.id)
  }

  private fun controllerAim(controllerEntity: Entity): Pair<Vector3, Vector3>? {
    if (!controllerEntity.hasComponent<Transform>()) return null
    val pose = controllerEntity.getComponent<Transform>().transform
    val direction = pose.q * Vector3(0f, 0f, 1f)
    if (direction.length() < 0.001f) return null
    return pose.t to direction.normalize()
  }

  private fun rayHit(controllerEntity: Entity): HitInfo? {
    val aim = controllerAim(controllerEntity) ?: return null
    val origin = aim.first
    val direction = aim.second
    val hit = scene.lineSegmentIntersect(origin, origin + direction * RAY_LENGTH_M) ?: return null
    val hitEntity = hit.entity ?: return null
    if (hitEntity == Entity.nullEntity()) return null
    if (hit.distance <= 0.02f || hit.distance > RAY_LENGTH_M) return null
    return hit
  }

  private fun gripOwnsWorkspace(): Boolean {
    val root = workspaceRootEntity ?: return false
    if (!root.hasComponent<IsdkGrabbable>()) return false
    return root.getComponent<IsdkGrabbable>().grabState == IsdkGrabState.Grabbed
  }

  private fun updatePointAndTriggerGrab() {
    val root = workspaceRootEntity ?: return
    if (!root.hasComponent<Transform>()) return
    if (gripOwnsWorkspace()) {
      if (rayDrag != null) {
        rayDrag = null
        recordBreadcrumb(
          event = "workspace_ray_grab_yielded_to_grip",
          details = JSONObject(),
        )
      }
      return
    }

    val rootPose = root.getComponent<Transform>().transform
    val drag = rayDrag
    if (drag != null) {
      val controllerEntity = controllerById(drag.controllerId)
      val controller = controllerEntity?.let { entity ->
        if (entity.hasComponent<Controller>()) entity.getComponent<Controller>() else null
      }
      val held = controller != null && controllerSelectHeld(controller)
      if (controllerEntity == null || !held) {
        finishRayDrag(root, cancelled = controllerEntity == null)
      } else {
        applyRayDrag(root, controllerEntity, drag)
      }
      return
    }

    val mask = selectMask()
    Query.where { has(Controller.id) }.eval().forEach { entity ->
      if (rayDrag != null) return@forEach
      if (!entity.hasComponent<Controller>()) return@forEach
      val controller = entity.getComponent<Controller>()
      if (!controller.isActive || controller.type != ControllerType.CONTROLLER) return@forEach
      if (!controllerSelectPressed(controller)) return@forEach
      val hit = rayHit(entity) ?: return@forEach
      val hitEntity = hit.entity ?: return@forEach
      if (!isGrabVolume(hitEntity)) return@forEach
      val start = rootPose.t.copy()
      rayDrag = RayDrag(
        controllerId = entity.id,
        distance = hit.distance,
        offset = start - hit.point,
        startPos = start,
        startRot = rootPose.q.copy(),
        buttonMask = controller.buttonState and mask,
      )
      rayGrabCount += 1
      recordBreadcrumb(
        event = "workspace_ray_grab_started",
        details = JSONObject()
          .put("rayGrabCount", rayGrabCount)
          .put("buttons", selectButtonsLabel(controller.buttonState and mask))
          .put("controllerId", entity.id)
          .put("hitDistanceMeters", hit.distance.toDouble())
          .put("startPos", poseVectorToJson(start)),
      )
    }
  }

  private fun controllerById(id: Long): Entity? {
    var found: Entity? = null
    Query.where { has(Controller.id) }.eval().forEach { entity ->
      if (entity.id == id) found = entity
    }
    return found
  }

  private fun applyRayDrag(root: Entity, controllerEntity: Entity, drag: RayDrag) {
    val aim = controllerAim(controllerEntity) ?: return
    val point = aim.first + aim.second * drag.distance
    val pose = root.getComponent<Transform>().transform
    root.setComponent(Transform(Pose(point + drag.offset, pose.q)))
  }

  private fun finishRayDrag(root: Entity, cancelled: Boolean) {
    val drag = rayDrag ?: return
    val pose = root.getComponent<Transform>().transform
    val delta = pose.t - drag.startPos
    val distance = delta.length()
    val reverted = !cancelled && distance < RAY_TAP_EPSILON_M
    if (reverted) {
      root.setComponent(Transform(Pose(drag.startPos.copy(), drag.startRot.copy())))
    }
    rayDrag = null
    recordBreadcrumb(
      event = "workspace_ray_grab_released",
      details = JSONObject()
        .put("rayGrabCount", rayGrabCount)
        .put("buttons", selectButtonsLabel(drag.buttonMask))
        .put("cancelled", cancelled)
        .put("revertedTap", reverted)
        .put("endPos", poseVectorToJson(if (reverted) drag.startPos else pose.t))
        .put("distanceMovedMeters", if (reverted) 0.0 else distance.toDouble()),
    )
  }

  private fun keepGrabHitVolumeRayOnly() {
    val hit = grabHitEntity ?: return
    if (hit.hasComponent<IsdkBoxCollider>()) hit.tryRemoveComponent<IsdkBoxCollider>()
    if (hit.hasComponent<IsdkGrabbable>()) hit.tryRemoveComponent<IsdkGrabbable>()
    if (hit.hasComponent<IsdkGrabProxy>()) hit.tryRemoveComponent<IsdkGrabProxy>()
  }

  private data class RayDrag(
    val controllerId: Long,
    val distance: Float,
    val offset: Vector3,
    val startPos: Vector3,
    val startRot: Quaternion,
    val buttonMask: Int,
  )

  /**
   * Registered in PriorityGroup.NORMAL via systemManager.registerSystem().
   * Note on Meta Spatial SDK 0.15.0 SystemDependencies / SystemDAG semantics:
   * - `mustRunBefore` is the set of dependency systems that must execute BEFORE this system.
   * - `mustRunAfter` is the set of dependent systems that must execute AFTER this system.
   *
   * Runs every frame after IsdkSystem (EARLY) and before TickDataModelSystem (NORMAL) /
   * TickTransformSystem (LATE) to:
   * 1. Keep grabPillEntity's dedicated 40 cm x 7 cm x 7 cm IsdkBoxCollider intact if
   *    IsdkComponentCreationSystem (EARLY) overwrote it on initial RoundedBox creation.
   * 2. Keep workspaceRoot strictly upright (zero pitch/roll) while preserving smooth,
   *    snap-free 3D translation and vertical-axis yaw from IsdkGrabProxy.
   * 3. Record grab state transitions (Hovered / Grabbed / Released) with 3D pose deltas.
   */
  inner class UprightWorkspaceSystem : SystemBase() {
    private var previousGrabState: IsdkGrabState = IsdkGrabState.NotGrabbed
    private var grabStartPos: Vector3? = null

    override fun getDependencies(): SystemDependencies {
      return SystemDependencies(
        mustRunBefore = mutableSetOf(
          SystemDependencyConfig(IsdkSystem::class, true),
        ),
        mustRunAfter = mutableSetOf(
          SystemDependencyConfig(TickDataModelSystem::class, false),
          SystemDependencyConfig(TickTransformSystem::class, false),
        ),
      )
    }

    override fun execute() {
      if (!hasAlignedToInitialViewerPose) {
        alignWorkspaceToViewerIfNeeded(trigger = "firstFrameViewerPose")
      }

      val panelObject = proofPanelSceneObject
      if (!panelLayerConfigured && panelObject != null) {
        applyPanelLayerZIndex(panelObject)
      }
      keepGrabHitVolumeRayOnly()

      val pill = grabPillEntity
      if (pill != null && pill.hasComponent<IsdkBoxCollider>()) {
        val collider = pill.getComponent<IsdkBoxCollider>()
        val size = collider.size
        if (
          abs(size.x - GRAB_COLLIDER_WIDTH_M) > 0.001f ||
          abs(size.y - GRAB_COLLIDER_HEIGHT_M) > 0.001f ||
          abs(size.z - GRAB_COLLIDER_DEPTH_M) > 0.001f
        ) {
          pill.setComponent(
            IsdkBoxCollider(
              size = Vector3(
                GRAB_COLLIDER_WIDTH_M,
                GRAB_COLLIDER_HEIGHT_M,
                GRAB_COLLIDER_DEPTH_M,
              ),
              offset = Vector3(0f, 0f, 0f),
            ),
          )
        }
      }

      val root = workspaceRootEntity ?: return
      if (!root.hasComponent<Transform>()) return

      updatePointAndTriggerGrab()

      val transform = root.getComponent<Transform>()
      val currentPose = transform.transform
      val uprightQ = currentPose.q.removePitchAndRoll().normalize()
      if (!currentPose.q.isWithinAngleDegrees(uprightQ, 0.05f)) {
        root.setComponent(Transform(Pose(currentPose.t, uprightQ)))
      }

      if (root.hasComponent<IsdkGrabbable>()) {
        val grabbable = root.getComponent<IsdkGrabbable>()
        val state = grabbable.grabState
        if (state != previousGrabState) {
          if (state == IsdkGrabState.Grabbed) {
            grabCount += 1
            grabStartPos = currentPose.t.copy()
            recordBreadcrumb(
              event = "workspace_grab_started",
              details = JSONObject()
                .put("grabCount", grabCount)
                .put("startPos", poseVectorToJson(currentPose.t)),
            )
          } else if (previousGrabState == IsdkGrabState.Grabbed) {
            val start = grabStartPos ?: currentPose.t
            val delta = currentPose.t - start
            recordBreadcrumb(
              event = "workspace_grab_released",
              details = JSONObject()
                .put("grabCount", grabCount)
                .put("endPos", poseVectorToJson(currentPose.t))
                .put("deltaMeters", poseVectorToJson(delta))
                .put("distanceMovedMeters", delta.length()),
            )
          }
          previousGrabState = state
        }
      }
    }
  }

  private fun safeParseJson(raw: String): JSONObject {
    return try {
      JSONObject(raw)
    } catch (_: Throwable) {
      JSONObject().put("raw", raw)
    }
  }

  private fun poseVectorToJson(v: Vector3): JSONObject {
    return JSONObject()
      .put("x", String.format("%.4f", v.x).toDouble())
      .put("y", String.format("%.4f", v.y).toDouble())
      .put("z", String.format("%.4f", v.z).toDouble())
  }

  private fun poseQuaternionToJson(q: Quaternion): JSONObject {
    return JSONObject()
      .put("w", String.format("%.4f", q.w).toDouble())
      .put("x", String.format("%.4f", q.x).toDouble())
      .put("y", String.format("%.4f", q.y).toDouble())
      .put("z", String.format("%.4f", q.z).toDouble())
  }

  @Synchronized
  private fun recordBreadcrumb(event: String, details: JSONObject) {
    try {
      val entry = JSONObject()
        .put("timestampMs", System.currentTimeMillis())
        .put("event", event)
        .put("details", details)
      breadcrumbEvents.put(entry)
      Log.i(TAG, "BREADCRUMB: $entry")

      val summary = JSONObject()
        .put("packageName", packageName)
        .put("activity", "HomeProofSpatialActivity")
        .put("spatialSdkVersion", "0.15.0")
        .put("buttonClickCount", buttonClickCount)
        .put("grabCount", grabCount)
        .put("rayGrabCount", rayGrabCount)
        .put("lastInputText", lastInputText)
        .put("lastSubmittedText", lastSubmittedText)
        .put("eventCount", breadcrumbEvents.length())
        .put("events", breadcrumbEvents)

      val file = File(filesDir, "home-proof-breadcrumbs.json")
      file.writeText(summary.toString(2))
    } catch (t: Throwable) {
      Log.w(TAG, "Failed writing breadcrumb for $event", t)
    }
  }
}
