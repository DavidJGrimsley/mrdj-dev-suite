import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, GripHorizontal, Move, Music2, Check, Volume2 } from "lucide-react";
import { LEEKBEATS_TRACKS, PLAYLIST_NAME } from "./leekBeatsPlaylist";
import { chatScale } from "../widgets/chatScale";

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
  /** When true, starts larger & centered in B05 and glides to lower-left on fullPlayerRevealed. */
  animateIntro?: boolean;
  /** External docking control (stays in spotlight until advancing past B05). */
  docked?: boolean;
  /**
   * "floating": the unboxed lower-left Home player (spotlight → dock).
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
  /** Fires whenever audio starts playing or changes to a new track. */
  onMusicPlay?: () => void;
  /** Fires synchronously in the click handler, same tick as audio.play(). */
  onPressStart?: () => void;
  onPlayAttempt?: (result: PlaybackAttemptResult) => void;
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

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  onMusicPlay,
  onPressStart,
  onPlayAttempt,
  onPositionMoved,
}: LeekBeatsWidgetProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeAfterSwitchRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [internalDocked, setInternalDocked] = useState<boolean>(() => !animateIntro || fullPlayerRevealed);
  const docked = controlledDocked !== undefined ? controlledDocked : internalDocked;
  const [keyboardMoveActive, setKeyboardMoveActive] = useState(false);
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
  const framed = placement === "panel";

  // Reset docked state when hidden at the start of an onboarding run;
  // once fullPlayerRevealed becomes true in B05 Turn 1, hold briefly in the
  // center spotlight so the user sees the full player assemble, then glide to lower-left.
  useEffect(() => {
    if (!playButtonRevealed && !fullPlayerRevealed) {
      setInternalDocked(!animateIntro);
      setUserMoved(false);
      setKeyboardMoveActive(false);
      setPosition(DEFAULT_POSITION);
      return;
    }
    if (!animateIntro || prefersReducedMotion()) {
      setInternalDocked(true);
      return;
    }
    if (controlledDocked === undefined && fullPlayerRevealed && !internalDocked) {
      const timer = window.setTimeout(() => {
        setInternalDocked(true);
      }, 1100);
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

  const handleMoveKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
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

  // Spotlight coordinates: positioned with generous space to the LEFT of Infie's message box
  // Message box has max-w-[540px] (half-width = 270px, left edge = vw / 2 - 270).
  // Full widget width is ~274px. With spotlightLeft = vw / 2 - 270 - 340, the entire widget
  // (including Prev, Play, Next, and the track Label) ends at vw / 2 - 270 - 40px, giving
  // plenty of clear space to the left of the message view with zero overlap.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const spotlightLeft = Math.max(20, Math.round(vw / 2 - 270 * chatScale() - 340));
  const spotlightBottom = Math.max(160, Math.round(vh - 380));
  const isDockedNow = docked || userMoved;
  const targetLeft = isDockedNow ? position.left : spotlightLeft;
  const targetBottom = isDockedNow ? position.bottom : spotlightBottom;
  const targetScale = isDockedNow ? 1 : fullPlayerRevealed ? 1.1 : 1.35;

  const compact = framed;
  const slotPx = compact ? PANEL_SLOT : SLOT;
  const playPx = compact ? PANEL_PLAY : 40;
  const gapPx = compact ? PANEL_GAP : GAP;

  // Move affordance (B18+): drag, or press and use the arrow keys.
  const renderMoveControls = (gripRef?: React.Ref<HTMLButtonElement>) => (
    <>
      <button
        ref={gripRef}
        type="button"
        aria-label={keyboardMoveActive ? "Move player with arrow keys, press Enter when done" : "Move player"}
        aria-pressed={keyboardMoveActive}
        title="Drag, or press and use arrow keys"
        onClick={() => setKeyboardMoveActive((v) => !v)}
        onKeyDown={handleMoveKeyDown}
        onPointerDown={(e) => {
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
            transition={{ duration: 0.35 }}
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
          transition={{ duration: 0.35 }}
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
            transition={{ duration: 0.35 }}
            onClick={() => switchTrack(1)}
            aria-label="Next track"
            className="flex items-center justify-center size-full rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/60"
            style={ghost}
          >
            <SkipForward size={13} />
          </motion.button>
        )}
      </div>

      {/* label (playlist + track text) */}
      {fullPlayerRevealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className={`flex flex-col justify-center pl-1 ${compact ? "flex-1 min-w-0" : ""}`}
          style={compact ? undefined : { minWidth: 120 }}
        >
          <span
            className={compact ? "truncate" : undefined}
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: "#abefa3", letterSpacing: "-0.01em" }}
          >
            {PLAYLIST_NAME}
          </span>
          <span
            className={compact ? "truncate" : undefined}
            style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.6)" }}
          >
            {track.title}
          </span>
        </motion.div>
      )}
    </>
  );

  // Bordered widget frame used in Project/Session (panel slot or popped-out float).
  const renderFrame = (gripRef?: React.Ref<HTMLButtonElement>) => (
    <div
      data-name="LeekBeatsFrame"
      className={`w-full rounded-[6px] overflow-clip transition-shadow ${calloutGlow ? "infie-glow" : ""}`}
      style={{
        border: calloutGlow ? "1px solid #2dd4bf" : "1px solid rgba(255, 255, 255, 0.05)",
        boxShadow: calloutGlow ? undefined : "0px 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        data-widget-header
        className="flex items-center gap-2 px-3 py-[7px] bg-[#1d1b20]"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
      >
        <Music2 size={12} className="text-[#555] shrink-0" aria-hidden="true" />
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">
          Music
        </span>
        {moveResizeRevealed && (
          <div data-name="LeekBeatsMoveResizeControls" className="ml-auto flex items-center gap-1.5">
            {renderMoveControls(gripRef)}
          </div>
        )}
      </div>
      <div className="flex items-center px-3 py-2.5 bg-[#252323]" style={{ gap: gapPx }}>
        {transport}
      </div>
    </div>
  );

  // Expanded widget: a small library. Artists on the left, their songs on the right; fullscreen
  // adds the provider options. Only tracks that really ship with the prototype are listed.
  const artists = Array.from(new Set(LEEKBEATS_TRACKS.map((t) => t.artist)));
  const shownTracks = LEEKBEATS_TRACKS.map((t, index) => ({ t, index })).filter(
    ({ t }) => !artistFilter || t.artist === artistFilter
  );
  const PROVIDERS = [
    { name: "Apple Music", tint: "#fa586a" },
    { name: "Spotify", tint: "#1ed760" },
    { name: "YouTube Music", tint: "#ff4e45" },
    { name: "SoundCloud", tint: "#ff7a1a" },
    { name: "Tidal", tint: "#9ad7ff" },
    { name: "Local files", tint: "#c5c5c5" },
  ];
  const sideRow = (active: boolean) =>
    `w-full text-left px-3 py-[6px] rounded-[6px] font-['Rounded_Mplus_1c',sans-serif] text-[12px] truncate transition-colors ${
      active ? "bg-[#abefa3]/12 text-[#abefa3]" : "text-[#c5c5c5] hover:bg-white/5"
    }`;
  const library = (
    <div data-name="LeekBeatsLibrary" data-library-mode={libraryMode} className="flex flex-col flex-1 w-full min-h-0 bg-[#1a1a1a] select-none">
      <div data-widget-header className="flex items-center gap-2 px-4 py-[9px] bg-[#1d1b20] shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Music2 size={13} className="text-[#abefa3] shrink-0" aria-hidden="true" />
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#aaa]">
          Music{libraryMode === "providers" ? " · Library & providers" : " · Library"}
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
            {libraryMode === "providers"
              ? "Connect a provider to bring in your own library."
              : "Triple-click the header for fullscreen to connect a music provider."}
          </p>
        </div>
        {libraryMode === "providers" && (
          <div data-name="LeekBeatsProviders" className="w-[300px] shrink-0 flex flex-col gap-2 p-3 overflow-y-auto" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="px-1 font-['Rounded_Mplus_1c',sans-serif] text-[9.5px] uppercase tracking-wider text-[#666]">Music providers</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#abefa3]/8" style={{ border: "1px solid rgba(171,239,163,0.3)" }}>
              <span className="size-2 rounded-full bg-[#abefa3] shrink-0" />
              <span className="flex-1 min-w-0 font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-white truncate">{PLAYLIST_NAME} (built in)</span>
              <span className="inline-flex items-center gap-1 font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#abefa3]"><Check size={11} /> Playing from</span>
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

  return (
    <>
      {librarySlot && anyRevealed && createPortal(library, librarySlot)}
      {/* The single persistent audio instance — always mounted, even before reveal. */}
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
            transition={{ duration: 0.3 }}
            className="w-full select-none"
          >
            {renderFrame()}
          </motion.div>,
          panelSlot
        )}

      {/* Floating: unboxed spotlight → lower-left dock on Home; bordered when moved in Project/Session. */}
      {mode === "floating" && (
        <motion.div
          ref={floatingRef}
          data-name="LeekBeatsWidget"
          data-placement="floating"
          data-framed={framed ? "true" : "false"}
          data-docked={isDockedNow ? "true" : "false"}
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
            opacity: { duration: 0.35 },
            left: { duration: prefersReducedMotion() || userMoved ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
            bottom: { duration: prefersReducedMotion() || userMoved ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: prefersReducedMotion() ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed z-50 flex items-center select-none"
          style={{
            gap: framed ? 0 : GAP,
            width: framed ? FRAMED_FLOATING_WIDTH : undefined,
            transformOrigin: "62px 50%",
            background: "transparent",
            border: "none",
          }}
        >
          {framed ? (
            renderFrame(floatingGripRef)
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
