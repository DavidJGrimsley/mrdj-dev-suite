import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, GripHorizontal, Move, Music2, Check, Volume2, Maximize2, Minimize2, Expand, ListMusic, X } from "lucide-react";
import { LEEKBEATS_TRACKS, PLAYLIST_NAME } from "./leekBeatsPlaylist";
import { chatScale } from "../widgets/chatScale";
import {
  HEADER_CLICK_GAP_MS,
  applyHeaderClick,
  classifyHeaderGestureClick,
  expireHeaderGesture,
  headerAnchorBox,
  pointInHeaderAnchor,
  type HeaderAnchorBox,
  type HeaderGesture,
  type HeaderMode,
} from "../widgets/dockBehavior";

// ─── Persistent lower-left Home music widget (LeekBeats) ────────────────────
// - One <audio> element for the life of the shell: time, volume, track and
//   position survive navigation because this component is mounted at the root.
// - Slot layout [prev][PLAY][next][label]: unrevealed slots are empty spacers,
//   so the Play button never moves when the rest of the player is revealed.
// - isPlaying is derived ONLY from audio events, never set optimistically, so
//   the UI cannot claim playback that is not happening.
// - play() is called synchronously inside the click handler (gesture-valid).

export type PlaybackAttemptResult = "played" | "paused" | "blocked_or_unavailable";

export interface LeekBeatsWidgetProps {
  playButtonRevealed: boolean;
  fullPlayerRevealed: boolean;
  moveResizeRevealed: boolean;
  calloutGlow?: boolean;
  /** When true, enlarges the B05 Play button beside Continue, then glides it home after assembly. */
  animateIntro?: boolean;
  /** External docking control (stays in spotlight until advancing past B05). */
  docked?: boolean;
  /**
   * "floating": Play stays an unframed spotlight. Once the full player starts
   * moving to its Home position it is a bounded Music widget and stays framed.
   * "panel": Project/Session — a bordered widget rendered into `panelSlot`
   * (bottom of the right column) so it never covers content.
   */
  placement?: "floating" | "panel";
  /** DOM slot provided by Project Home / Session (right column bottom). */
  panelSlot?: HTMLElement | null;
  /**
   * Expanded / fullscreen music widget: a slot to render the library into. "library" is the
   * song and artist picker; "providers" adds the music-provider options beside it.
   */
  librarySlot?: HTMLElement | null;
  libraryMode?: "library" | "providers";
  /** Called when the user picks a provider to connect (simulated in the prototype). */
  onProviderConnect?: (provider: string) => void;
  /**
   * Whether dragging the player out of its panel makes it float (the onboarding tutorial's
   * "try moving the music player"). Outside the tutorial the dock moves it like any widget.
   */
  allowPanelFloat?: boolean;
  /** Accessible keyboard Move handler when the player is a dock widget. */
  onMoveToBottomPanel?: () => void;
  /** Fires whenever audio starts playing or changes to a new track. */
  onMusicPlay?: () => void;
  /** Fires synchronously in the click handler, same tick as audio.play(). */
  onPressStart?: () => void;
  onPlayAttempt?: (result: PlaybackAttemptResult) => void;
  /** Mirrors the audio element's real playing state (from its events). */
  onPlayingChange?: (playing: boolean) => void;
  onPositionMoved?: (pos: { left: number; bottom: number }) => void;
}

const SLOT = 32;
const GAP = 10;
// Compact transport sizes inside the bordered panel (fits the 230–272px columns).
const PANEL_SLOT = 28;
const PANEL_PLAY = 36;
const PANEL_GAP = 8;
const FRAMED_FLOATING_WIDTH = 240;
const DEFAULT_POSITION = { left: 24, bottom: 24 };
const HOME_OVERLAY_ID = "leekbeats-home";
const ACTION_CHIP =
  "rounded bg-[#1d1b20]/85 text-[#666] transition-colors p-0.5 hover:text-[#abefa3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60";

/**
 * The Play spotlight stays unframed. A normal bounded Music widget begins at the
 * Home move and keeps its own expand, fullscreen, and song-picker actions whenever
 * that framed player is floating (Home, or popped out of a column).
 */
export function musicHomeFrame(options: {
  fullPlayerRevealed: boolean;
  docked: boolean;
  placement: "floating" | "panel";
  floating: boolean;
}): { framed: boolean; actions: boolean } {
  const travelingHome = options.fullPlayerRevealed && options.docked;
  const framed = options.placement === "panel" || travelingHome;
  return {
    framed,
    actions: framed && options.floating && travelingHome,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Spotlight coordinates: place the Play button directly to the left of the pre-dock
// Continue button on the same row, then glide home to the lower-left after assembly.
function measureMusicSpotlightPos(): { left: number; bottom: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const s = chatScale();
  const rowEl =
    typeof document !== "undefined"
      ? document.querySelector('[data-name="DockedChatActionRow"]')
      : null;
  if (rowEl) {
    const rowRect = rowEl.getBoundingClientRect();
    const btnEl = rowEl.querySelector("button");
    const btnRect = btnEl?.getBoundingClientRect();
    const rowCenterY = (rowRect.top + rowRect.bottom) / 2;
    const continueLeft = btnRect
      ? btnRect.left
      : (rowRect.left + rowRect.right) / 2 - 54 * s;
    // Play is 40px wide, centered at x=62 within LeekBeatsWidget, scaled 1.35x around
    // "62px 50%" (visual radius 27px). Keep a clean 24px gap left of Continue.
    const playCenterX = continueLeft - 24 - 27;
    return {
      left: Math.max(12, Math.round(playCenterX - 62)),
      bottom: Math.max(12, Math.round(vh - rowCenterY - 20)),
    };
  }
  const fallbackContinueLeft = vw / 2 - 54 * s;
  return {
    left: Math.max(12, Math.round(fallbackContinueLeft - 24 - 27 - 62)),
    bottom: Math.max(80, Math.round(vh * 0.14 + 54 * s)),
  };
}

export function LeekBeatsWidget({
  playButtonRevealed,
  fullPlayerRevealed,
  moveResizeRevealed,
  calloutGlow = false,
  animateIntro = true,
  docked: controlledDocked,
  placement = "floating",
  panelSlot = null,
  librarySlot = null,
  libraryMode = "library",
  onProviderConnect,
  allowPanelFloat = true,
  onMoveToBottomPanel,
  onMusicPlay,
  onPressStart,
  onPlayAttempt,
  onPlayingChange,
  onPositionMoved,
}: LeekBeatsWidgetProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeAfterSwitchRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [internalDocked, setInternalDocked] = useState<boolean>(() => !animateIntro || fullPlayerRevealed);
  const docked =
    controlledDocked !== undefined
      ? controlledDocked
      : (prefersReducedMotion() && fullPlayerRevealed) || internalDocked;
  const [spotlightPos, setSpotlightPos] = useState<{ left: number; bottom: number } | null>(null);
  const [keyboardMoveActive, setKeyboardMoveActive] = useState(false);
  const [presentation, setPresentationState] = useState<HeaderMode>("normal");
  const presentationRef = useRef<HeaderMode>("normal");
  const gestureRef = useRef<HeaderGesture>({ count: 0, mode: "normal", pendingToggle: false });
  const headerAnchorRef = useRef<HeaderAnchorBox | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const songPickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const pickerWasOpenRef = useRef(false);
  // Once the user drags (or keyboard-moves) the player it floats at their position everywhere.
  const [userMoved, setUserMoved] = useState(false);
  const userMovedRef = useRef(false);
  userMovedRef.current = userMoved;
  const dragStartRef = useRef<{ x: number; y: number; left: number; bottom: number; fromPanel: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const floatingGripRef = useRef<HTMLButtonElement | null>(null);

  const track = LEEKBEATS_TRACKS[trackIndex] ?? LEEKBEATS_TRACKS[0];
  const anyRevealed = playButtonRevealed || fullPlayerRevealed;

  // Which presentation to render. "hidden" covers the brief Project/Session
  // route cross-fade before the next screen's slot mounts (no lower-left flash).
  const floats = userMoved && (placement !== "panel" || allowPanelFloat);
  const mode: "floating" | "panel" | "hidden" = !anyRevealed
    ? "hidden"
    : floats
    ? "floating"
    : placement === "panel"
    ? panelSlot
      ? "panel"
      : "hidden"
    : "floating";

  // Reset docked state when hidden at the start of an onboarding run;
  // once fullPlayerRevealed becomes true in B05 Turn 1, hold briefly in its spotlight
  // position so the user sees the full player assemble, then glide to lower-left.
  useEffect(() => {
    if (!playButtonRevealed && !fullPlayerRevealed) {
      setInternalDocked(!animateIntro);
      setUserMoved(false);
      setKeyboardMoveActive(false);
      setPosition(DEFAULT_POSITION);
      presentationRef.current = "normal";
      gestureRef.current = { count: 0, mode: "normal", pendingToggle: false };
      setPresentationState("normal");
      return;
    }
    if (!animateIntro) {
      setInternalDocked(true);
      return;
    }
    if (prefersReducedMotion()) {
      // The Play spotlight stays put. Once the full player exists, skip the glide.
      if (fullPlayerRevealed) setInternalDocked(true);
      return;
    }
    if (controlledDocked === undefined && fullPlayerRevealed && !internalDocked) {
      const timer = window.setTimeout(() => {
        setInternalDocked(true);
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [playButtonRevealed, fullPlayerRevealed, animateIntro, internalDocked, controlledDocked]);

  const updatePosition = useCallback(
    (next: { left: number; bottom: number }) => {
      const width = floatingRef.current?.offsetWidth || FRAMED_FLOATING_WIDTH;
      const height = floatingRef.current?.offsetHeight || 80;
      const clamped = {
        left: Math.max(12, Math.min(window.innerWidth - width - 12, next.left)),
        bottom: Math.max(12, Math.min(window.innerHeight - height - 12, next.bottom)),
      };
      setPosition(clamped);
      onPositionMoved?.(clamped);
    },
    [onPositionMoved]
  );

  // Pop the bordered panel out of its column slot at its current on-screen rect,
  // so moving it never jumps.
  const popOutFromPanel = useCallback((): { left: number; bottom: number } | null => {
    const el = panelRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const pos = { left: Math.round(r.left), bottom: Math.round(window.innerHeight - r.bottom) };
    setPosition(pos);
    setUserMoved(true);
    return pos;
  }, []);

  // After a src change caused by Prev/Next/ended, resume playback if we were playing.
  useEffect(() => {
    if (!resumeAfterSwitchRef.current) return;
    resumeAfterSwitchRef.current = false;
    audioRef.current?.play().catch(() => setIsPlaying(false));
  }, [trackIndex]);

  // Keep keyboard focus on the Move control when the panel pops out to float.
  useEffect(() => {
    if (userMoved && keyboardMoveActive) floatingGripRef.current?.focus();
  }, [userMoved, keyboardMoveActive]);

  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      onPlayAttempt?.("blocked_or_unavailable");
      return;
    }
    if (!audio.paused) {
      audio.pause();
      onPlayAttempt?.("paused");
      return;
    }
    // 1) Start playback synchronously inside the user's click.
    let promise: Promise<void> | undefined;
    try {
      promise = audio.play();
    } catch {
      promise = Promise.reject(new Error("play() threw"));
    }
    // 2) Same tick: let the host sync Infie's press animation + our pulse ring.
    setPulse((n) => n + 1);
    onPressStart?.();
    // 3) Report the real outcome.
    Promise.resolve(promise).then(
      () => onPlayAttempt?.("played"),
      () => {
        setIsPlaying(false);
        onPlayAttempt?.("blocked_or_unavailable");
      }
    );
  }, [onPlayAttempt, onPressStart]);

  // Library: pick a specific song. Same-tick play() keeps it gesture-valid.
  const playTrack = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (index === trackIndex) {
        if (audio?.paused) audio.play().catch(() => setIsPlaying(false));
        return;
      }
      resumeAfterSwitchRef.current = true;
      setTrackIndex(index);
    },
    [trackIndex]
  );

  const switchTrack = useCallback(
    (delta: 1 | -1) => {
      const audio = audioRef.current;
      resumeAfterSwitchRef.current = Boolean(audio && !audio.paused);
      setTrackIndex((i) => (i + delta + LEEKBEATS_TRACKS.length) % LEEKBEATS_TRACKS.length);
      if (audio && !audio.paused) {
        onMusicPlay?.();
      }
    },
    [onMusicPlay]
  );

  // Pointer drag (revealed in B18)
  useEffect(() => {
    if (!moveResizeRevealed) return;
    const move = (e: PointerEvent) => {
      const s = dragStartRef.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      // A press on the panel's grip only pops it out once the pointer actually moves.
      if (s.fromPanel && !userMovedRef.current) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        setUserMoved(true);
      }
      updatePosition({ left: s.left + dx, bottom: s.bottom - dy });
    };
    const up = () => { dragStartRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [moveResizeRevealed, updatePosition]);

  const handleMoveKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (mode === "panel" && !allowPanelFloat && onMoveToBottomPanel) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        (keyboardMoveActive && (e.key === "Enter" || e.key === " "))
      ) {
        e.preventDefault();
        setKeyboardMoveActive(false);
        onMoveToBottomPanel();
        return;
      }
    }
    if (!keyboardMoveActive) return;
    const step = e.shiftKey ? 32 : 16;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step],
    };
    const d = deltas[e.key];
    if (d) {
      e.preventDefault();
      let base = position;
      if (mode === "panel") {
        const popped = popOutFromPanel();
        if (popped) base = popped;
      }
      updatePosition({ left: base.left + d[0], bottom: base.bottom + d[1] });
    } else if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      setKeyboardMoveActive(false);
    }
  };

  const ghost: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "rgba(255, 255, 255, 0.8)",
  };
  const glow: React.CSSProperties = {
    background: "rgba(45, 212, 191, 0.16)",
    border: "1px solid #2dd4bf",
    color: "#2dd4bf",
    boxShadow: "0 0 14px rgba(45, 212, 191, 0.45)",
  };

  const isDockedNow = docked || userMoved;
  const homeFrame = musicHomeFrame({
    fullPlayerRevealed,
    docked: isDockedNow,
    placement,
    floating: mode === "floating",
  });
  const framed = homeFrame.framed;
  const selfContained = homeFrame.actions;

  const commitPresentation = useCallback((next: HeaderMode) => {
    presentationRef.current = next;
    setPresentationState((current) => (current === next ? current : next));
  }, []);

  const openPresentation = useCallback((next: HeaderMode) => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    gestureRef.current = { count: 0, mode: next, pendingToggle: false };
    headerAnchorRef.current = null;
    commitPresentation(next);
  }, [commitPresentation]);

  useEffect(() => {
    if (selfContained) return;
    openPresentation("normal");
  }, [selfContained, openPresentation]);

  // Same header gesture as every dock widget: double-click expands, triple-click fullscreens.
  useEffect(() => {
    if (!selfContained) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const header = target.closest("[data-widget-header]");
      const owned = Boolean(
        header?.closest("[data-name='LeekBeatsWidget'], [data-widget-overlay='" + HOME_OVERLAY_ID + "']"),
      );
      const kind = classifyHeaderGestureClick({
        onInteractive: Boolean(target.closest("button, a, input, textarea, select, [role='button'], [data-no-widget-gesture]")),
        onOwnedHeader: owned,
        gestureOpen: gestureRef.current.count > 0,
        inAnchor: pointInHeaderAnchor(headerAnchorRef.current, event.clientX, event.clientY),
        onForeignHeader: Boolean(header) && !owned,
        onOwnOverlay: Boolean(target.closest("[data-widget-overlay='" + HOME_OVERLAY_ID + "']")),
      });
      if (!kind) return;
      if (kind === "continue") {
        event.preventDefault();
        event.stopPropagation();
      } else if (header) {
        headerAnchorRef.current = headerAnchorBox(header.getBoundingClientRect());
      }
      const next = applyHeaderClick(gestureRef.current, false);
      gestureRef.current = { count: next.count, mode: next.mode, pendingToggle: next.pendingToggle };
      if (next.count === 0) headerAnchorRef.current = null;
      if (next.mode !== presentationRef.current) commitPresentation(next.mode);
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (next.count === 0) return;
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        if (gestureRef.current.mode !== presentationRef.current) {
          gestureRef.current = { count: 0, mode: presentationRef.current, pendingToggle: false };
          headerAnchorRef.current = null;
          return;
        }
        const expired = expireHeaderGesture(gestureRef.current);
        gestureRef.current = expired;
        headerAnchorRef.current = null;
        if (expired.mode !== presentationRef.current) commitPresentation(expired.mode);
      }, HEADER_CLICK_GAP_MS);
    };
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, [selfContained, commitPresentation]);

  useLayoutEffect(() => {
    if (!anyRevealed) {
      setSpotlightPos(null);
      return;
    }
    if (isDockedNow || mode !== "floating") return;
    setSpotlightPos((prev) => prev ?? measureMusicSpotlightPos());
    const onResize = () => {
      if (!fullPlayerRevealed) {
        setSpotlightPos(measureMusicSpotlightPos());
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anyRevealed, isDockedNow, mode, fullPlayerRevealed]);

  const activeSpotlight = spotlightPos ?? measureMusicSpotlightPos();
  const targetLeft = isDockedNow ? position.left : activeSpotlight.left;
  const targetBottom = isDockedNow ? position.bottom : activeSpotlight.bottom;
  const targetScale = isDockedNow ? 1 : fullPlayerRevealed ? 1.1 : 1.35;

  const compact = framed;
  const uiMotion = prefersReducedMotion() ? 0 : 0.35;
  const showLocalLibrary = selfContained && presentation !== "normal" && !librarySlot;
  const slotPx = compact ? PANEL_SLOT : SLOT;
  const playPx = compact ? PANEL_PLAY : 40;
  const gapPx = compact ? PANEL_GAP : GAP;

  // Move affordance (B18+): drag, or press and use the arrow keys.
  const renderMoveControls = (gripRef?: React.Ref<HTMLButtonElement>) => (
    <>
      <button
        ref={gripRef}
        type="button"
        data-widget-move-grip
        aria-label={keyboardMoveActive ? "Move player with arrow keys, press Enter when done" : "Move player"}
        aria-pressed={keyboardMoveActive}
        title="Drag, or press and use arrow keys"
        onClick={() => setKeyboardMoveActive((v) => !v)}
        onKeyDown={handleMoveKeyDown}
        onPointerDown={(e) => {
          if (mode === "panel" && !allowPanelFloat) return;
          if (mode === "panel" && panelRef.current) {
            const r = panelRef.current.getBoundingClientRect();
            const start = { left: Math.round(r.left), bottom: Math.round(window.innerHeight - r.bottom) };
            setPosition(start);
            dragStartRef.current = { x: e.clientX, y: e.clientY, ...start, fromPanel: true };
          } else {
            dragStartRef.current = { x: e.clientX, y: e.clientY, left: position.left, bottom: position.bottom, fromPanel: false };
          }
        }}
        className={`flex items-center justify-center ${compact ? "size-6 rounded-[6px]" : "size-7 rounded-[8px]"} cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60`}
        style={calloutGlow ? glow : ghost}
      >
        {keyboardMoveActive ? <Move size={compact ? 12 : 13} /> : <GripHorizontal size={compact ? 12 : 13} />}
      </button>
    </>
  );

  // Transport + label: [prev][PLAY][next][label]. Unrevealed slots are empty
  // spacers, so Play never moves when the rest of the player is revealed.
  const transport = (
    <>
      {/* prev slot */}
      <div style={{ width: slotPx, height: slotPx }} className="shrink-0">
        {fullPlayerRevealed && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: uiMotion }}
            onClick={() => switchTrack(-1)}
            aria-label="Previous track"
            className="flex items-center justify-center size-full rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
            style={ghost}
          >
            <SkipBack size={13} />
          </motion.button>
        )}
      </div>

      {/* PLAY / PAUSE — fixed position from its very first appearance */}
      <div className="relative shrink-0" style={{ width: playPx, height: playPx }}>
        {pulse > 0 && !prefersReducedMotion() && (
          <motion.span
            key={pulse}
            aria-hidden="true"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.9 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: "2px solid rgba(171, 239, 163, 0.8)" }}
          />
        )}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: uiMotion }}
          onClick={handleTogglePlay}
          aria-label={isPlaying ? `Pause ${PLAYLIST_NAME}` : `Play ${PLAYLIST_NAME}`}
          className="relative flex items-center justify-center size-full rounded-full active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/70"
          style={{
            background: isPlaying ? "#abefa3" : "rgba(171, 239, 163, 0.14)",
            border: "1px solid rgba(171, 239, 163, 0.5)",
            color: isPlaying ? "#061413" : "#abefa3",
          }}
        >
          {isPlaying ? <Pause size={compact ? 15 : 16} /> : <Play size={compact ? 15 : 16} className="ml-0.5" />}
        </motion.button>
      </div>

      {/* next slot */}
      <div style={{ width: slotPx, height: slotPx }} className="shrink-0">
        {fullPlayerRevealed && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: uiMotion }}
            onClick={() => switchTrack(1)}
            aria-label="Next track"
            className="flex items-center justify-center size-full rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
            style={ghost}
          >
            <SkipForward size={13} />
          </motion.button>
        )}
      </div>

      {/* Artist and track title in every transport layout. */}
      {fullPlayerRevealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: uiMotion }}
          className={`flex flex-col justify-center pl-1 ${compact ? "flex-1 min-w-0" : ""}`}
          style={compact ? undefined : { minWidth: 120 }}
        >
          <span
            data-testid="music-track-primary"
            className={compact ? "truncate" : undefined}
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: "#abefa3", letterSpacing: "-0.01em" }}
          >
            {track.artist}
          </span>
          <span
            data-testid="music-track-title"
            className={compact ? "truncate" : undefined}
            style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.6)" }}
          >
            {track.title}
          </span>
        </motion.div>
      )}
    </>
  );

  const onFrameHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode === "panel") {
      handleMoveKeyDown(event);
      return;
    }
    if (!selfContained || event.target !== event.currentTarget) return;
    if (event.key === "Enter") {
      event.preventDefault();
      openPresentation("expanded");
    }
  };

  // Bordered widget frame. Panel chrome stays header-only because the dock supplies
  // expand and fullscreen. The Home float carries those actions itself.
  const renderFrame = (gripRef?: React.Ref<HTMLButtonElement>, placeholder = false) => (
    <div
      data-name="LeekBeatsFrame"
      className={`relative w-full flex flex-col flex-1 min-h-0 rounded-[6px] overflow-clip transition-shadow ${calloutGlow ? "infie-glow" : ""}`}
      style={{
        border: calloutGlow ? "1px solid #2dd4bf" : "1px solid rgba(255, 255, 255, 0.05)",
        boxShadow: calloutGlow ? undefined : "0px 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        data-widget-header
        tabIndex={mode === "panel" || selfContained ? 0 : undefined}
        aria-label={selfContained ? "Music" : undefined}
        onKeyDown={mode === "panel" || selfContained ? onFrameHeaderKeyDown : undefined}
        className="flex items-center gap-2 px-3 py-[7px] bg-[#1d1b20] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
      >
        <Music2 size={12} className="text-[#555] shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">
          Music
        </span>
        {((moveResizeRevealed && mode !== "panel") || (selfContained && !placeholder)) && (
        <div className="ml-auto flex items-center gap-1">
          {moveResizeRevealed && mode !== "panel" && (
            <div data-name="LeekBeatsMoveResizeControls" className="flex items-center gap-1.5">
              {renderMoveControls(gripRef)}
            </div>
          )}
          {selfContained && !placeholder && (
            <div data-music-actions="true" data-no-widget-gesture className="flex items-center gap-1">
              <button
                ref={songPickerButtonRef}
                type="button"
                title="Song picker"
                aria-label="Song picker"
                aria-haspopup="dialog"
                aria-expanded={presentation !== "normal"}
                onClick={() => openPresentation("expanded")}
                className={ACTION_CHIP}
              >
                <ListMusic size={10} />
              </button>
              <button
                type="button"
                title="Expand"
                aria-label="Expand Music"
                aria-haspopup="dialog"
                aria-expanded={presentation !== "normal"}
                onClick={() => openPresentation("expanded")}
                className={ACTION_CHIP}
              >
                <Maximize2 size={10} />
              </button>
              <button
                type="button"
                title="Fullscreen"
                aria-label="Fullscreen"
                aria-haspopup="dialog"
                aria-expanded={presentation === "fullscreen"}
                onClick={() => openPresentation("fullscreen")}
                className={ACTION_CHIP}
              >
                <Expand size={10} />
              </button>
            </div>
          )}
        </div>
        )}
      </div>
      {placeholder ? (
        <div
          data-dock-body
          className="grid place-items-center flex-1 min-h-[48px] px-3 py-4 bg-[#252323] font-['Rounded_Mplus_1c',sans-serif] text-[10px] uppercase tracking-wide text-[#555]"
        >
          Music · {presentation}
        </div>
      ) : (
        <div className="flex items-center px-3 py-2.5 bg-[#252323] flex-1 min-h-0" style={{ gap: gapPx }}>
          {transport}
        </div>
      )}
    </div>
  );

  // Expanded widget: a small library. Artists on the left, their songs on the right; fullscreen
  // adds the provider options. Only tracks that really ship with the prototype are listed.
  const artists = Array.from(new Set(LEEKBEATS_TRACKS.map((t) => t.artist)));
  const shownTracks = LEEKBEATS_TRACKS.map((t, index) => ({ t, index })).filter(
    ({ t }) => !artistFilter || t.artist === artistFilter
  );
  const PROVIDERS = [
    { name: "Brain.Fm", tint: "#38bdf8" },
    { name: "Apple Music", tint: "#fa586a" },
    { name: "Spotify", tint: "#1ed760" },
    { name: "YouTube Music", tint: "#ff4e45" },
    { name: "SoundCloud", tint: "#ff7a1a" },
    { name: "Tidal", tint: "#9ad7ff" },
    { name: "Local files", tint: "#c5c5c5" },
  ];
  const shownLibraryMode: "library" | "providers" = showLocalLibrary
    ? presentation === "fullscreen"
      ? "providers"
      : "library"
    : libraryMode;
  const sideRow = (active: boolean) =>
    `w-full text-left px-3 py-[6px] rounded-[6px] font-['Rounded_Mplus_1c',sans-serif] text-[12px] truncate transition-colors ${
      active ? "bg-[#abefa3]/12 text-[#abefa3]" : "text-[#c5c5c5] hover:bg-white/5"
    }`;
  const library = (
    <div data-name="LeekBeatsLibrary" data-library-mode={shownLibraryMode} className="flex flex-col flex-1 w-full min-h-0 bg-[#1a1a1a] select-none">
      <div data-widget-header className="flex items-center gap-2 px-4 py-[9px] pr-16 bg-[#1d1b20] shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Music2 size={13} className="text-[#abefa3] shrink-0" aria-hidden="true" />
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#aaa]">
          Music{shownLibraryMode === "providers" ? " · Library & providers" : " · Library"}
        </span>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-[170px] shrink-0 flex flex-col gap-0.5 p-2 overflow-y-auto" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="px-3 pt-1 pb-1.5 font-['Rounded_Mplus_1c',sans-serif] text-[9.5px] uppercase tracking-wider text-[#666]">Artists</p>
          <button type="button" className={sideRow(artistFilter === null)} onClick={() => setArtistFilter(null)}>All artists</button>
          {artists.map((a) => (
            <button key={a} type="button" data-artist={a} className={sideRow(artistFilter === a)} onClick={() => setArtistFilter(a)}>{a}</button>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          <div className="grid grid-cols-[28px_1fr_1fr] gap-2 px-4 py-1.5 font-['Rounded_Mplus_1c',sans-serif] text-[9.5px] uppercase tracking-wider text-[#666]" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span />
            <span>Song</span>
            <span>Artist</span>
          </div>
          {shownTracks.map(({ t, index }) => {
            const current = index === trackIndex;
            return (
              <button
                key={t.id}
                type="button"
                data-track={t.id}
                aria-current={current ? "true" : undefined}
                onClick={() => playTrack(index)}
                className={`grid grid-cols-[28px_1fr_1fr] gap-2 items-center px-4 py-2 text-left transition-colors ${current ? "bg-[#abefa3]/8" : "hover:bg-white/5"}`}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="flex items-center justify-center text-[#abefa3]">
                  {current ? (isPlaying ? <Volume2 size={13} /> : <Pause size={12} />) : <Play size={11} className="text-[#555]" />}
                </span>
                <span className={`font-['Rounded_Mplus_1c',sans-serif] text-[12.5px] truncate ${current ? "text-[#abefa3]" : "text-white"}`}>{t.title}</span>
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#999] truncate">{t.artist}</span>
              </button>
            );
          })}
          <p className="px-4 py-3 font-['Rounded_Mplus_1c',sans-serif] text-[10.5px] text-[#666]">
            {shownLibraryMode === "providers"
              ? "Connect a provider to bring in your own library."
              : "Triple-click the header for fullscreen to connect a music provider."}
          </p>
        </div>
        {shownLibraryMode === "providers" && (
          <div data-name="LeekBeatsProviders" className="w-[300px] shrink-0 flex flex-col gap-2 p-3 overflow-y-auto" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="px-1 font-['Rounded_Mplus_1c',sans-serif] text-[9.5px] uppercase tracking-wider text-[#666]">Music providers</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#abefa3]/8" style={{ border: "1px solid rgba(171,239,163,0.3)" }}>
              <span className="size-2 rounded-full bg-[#abefa3] shrink-0" />
              <span className="flex-1 min-w-0 font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-white truncate">i² Curated</span>
              <span className="inline-flex items-center gap-1 font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#abefa3]"><Check size={11} /> Playing</span>
            </div>
            {PROVIDERS.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/[0.03]" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="size-2 rounded-full shrink-0" style={{ background: p.tint }} />
                <span className="flex-1 min-w-0 font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#ddd] truncate">{p.name}</span>
                <button
                  type="button"
                  data-provider={p.name}
                  onClick={() => onProviderConnect?.(p.name)}
                  className="px-2.5 py-1 rounded-[6px] font-['Rounded_Mplus_1c',sans-serif] text-[10.5px] text-white hover:bg-white/10 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center px-4 py-3 bg-[#252323] shrink-0" style={{ gap: gapPx, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {transport}
      </div>
    </div>
  );

  useEffect(() => {
    if (!showLocalLibrary) {
      if (pickerWasOpenRef.current) {
        pickerWasOpenRef.current = false;
        songPickerButtonRef.current?.focus();
      }
      return;
    }
    pickerWasOpenRef.current = true;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-widget-move-grip]")) return;
      event.preventDefault();
      openPresentation("normal");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLocalLibrary, openPresentation]);

  const renderLibraryDialog = () => (
    <div
      data-widget-overlay={HOME_OVERLAY_ID}
      data-widget-mode={presentation}
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => openPresentation("normal")}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={presentation === "fullscreen" ? "Music fullscreen" : "Song picker"}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`relative bg-[#1a1a1a] border border-white/8 rounded-[10px] shadow-2xl flex flex-col overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60 ${presentation === "fullscreen" ? "fixed inset-3" : "w-[860px] h-[580px] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"}`}
      >
        <div data-no-widget-gesture className="absolute z-[2] top-[9px] right-[10px] flex items-center gap-1">
          <button
            type="button"
            onClick={() => openPresentation(presentation === "fullscreen" ? "expanded" : "fullscreen")}
            title={presentation === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
            aria-label={presentation === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
            className="p-1 rounded text-[#777] hover:text-[#abefa3] hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
          >
            {presentation === "fullscreen" ? <Minimize2 size={13} /> : <Expand size={13} />}
          </button>
          <button
            type="button"
            onClick={() => openPresentation("normal")}
            title="Back to normal"
            aria-label="Restore Music"
            className="p-1 rounded text-[#666] hover:text-[#abefa3] hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
          >
            <X size={14} />
          </button>
        </div>
        <div
          className="flex flex-col min-w-0 min-h-0 flex-[1_1_0%] [&>*]:flex-[1_1_0%] [&>*]:min-h-0 [&>*]:!rounded-none [&>*]:!border-0"
          style={{ zoom: prefersReducedMotion() ? 1 : presentation === "fullscreen" ? 1.7 : 1.4 }}
        >
          {library}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* First child, always. Conditional portals after this must not remount it,
          or track, playback position and volume would reset. */}
      <audio
        ref={audioRef}
        src={track.src}
        preload="none"
        onPlaying={() => {
          setIsPlaying(true);
          onMusicPlay?.();
        }}
        onPause={() => setIsPlaying(false)}
        onEmptied={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
        onEnded={() => {
          resumeAfterSwitchRef.current = true;
          setTrackIndex((i) => (i + 1) % LEEKBEATS_TRACKS.length);
        }}
      />
      {!showLocalLibrary && librarySlot && anyRevealed && createPortal(library, librarySlot)}
      {showLocalLibrary && createPortal(renderLibraryDialog(), document.body)}

      {/* Project/Session: bordered widget in the right-column slot (in the layout, never overlapping). */}
      {mode === "panel" &&
        panelSlot &&
        createPortal(
          <motion.div
            ref={panelRef}
            data-name="LeekBeatsWidget"
            data-placement="panel"
            data-framed="true"
            data-docked="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: uiMotion }}
            className="w-full flex flex-col flex-1 min-h-0 select-none"
          >
            {renderFrame()}
          </motion.div>,
          panelSlot
        )}

      {/* Floating: unframed Play spotlight, then a bounded Music widget from the Home move on. */}
      {mode === "floating" && (isDockedNow || spotlightPos !== null) && (
        <motion.div
          ref={floatingRef}
          data-name="LeekBeatsWidget"
          data-placement="floating"
          data-framed={framed ? "true" : "false"}
          data-docked={isDockedNow ? "true" : "false"}
          data-widget-mode={selfContained ? presentation : undefined}
          data-home-frame={selfContained ? "framed" : undefined}
          initial={{
            // Popping out of the panel must not flash: start fully visible.
            opacity: userMoved ? 1 : 0,
            left: targetLeft,
            bottom: targetBottom,
            scale: targetScale,
          }}
          animate={{
            opacity: 1,
            left: targetLeft,
            bottom: targetBottom,
            scale: targetScale,
          }}
          transition={{
            opacity: { duration: uiMotion },
            left: { duration: prefersReducedMotion() || userMoved ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
            bottom: { duration: prefersReducedMotion() || userMoved ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: prefersReducedMotion() ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
          }}
          className={`fixed z-50 select-none ${framed ? "flex flex-col" : "flex items-center"}`}
          style={{
            gap: framed ? 0 : GAP,
            width: framed ? FRAMED_FLOATING_WIDTH : undefined,
            transformOrigin: "62px 50%",
            background: "transparent",
            border: "none",
          }}
        >
          {framed ? (
            renderFrame(floatingGripRef, showLocalLibrary)
          ) : (
            <>
              {/* Move / resize (B18+) — floats above so it never shifts Play */}
              {moveResizeRevealed && (
                <div
                  data-name="LeekBeatsMoveResizeControls"
                  className="absolute flex items-center gap-1.5"
                  style={{ bottom: "100%", left: 0, marginBottom: 8 }}
                >
                  {renderMoveControls(floatingGripRef)}
                </div>
              )}
              {transport}
            </>
          )}
        </motion.div>
      )}
    </>
  );
}
