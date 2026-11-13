import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties } from "react";
import { TegakiEngine, type TegakiFrame, type TegakiPaintContext } from "tegaki/core";
import printFont from "./fonts/print/bundle";
import signatureFont from "./fonts/signature/bundle";
import { closingConfig, type ClosingConfig } from "./closingConfig";
import { dipPenPlugin, drawDipPen, penPosition, type PenPoint, type PenPosition } from "./dipPen";
import "./closing.css";

type Phase = "loading" | "quote" | "pause" | "signature" | "hold" | "turning" | "complete" | "error";

const statusLabel: Record<Phase, string> = {
  loading: "Preparing the page…",
  quote: "Writing Napoleon Hill quotation…",
  pause: "Quotation complete.",
  signature: "Signing Napoleon Hill…",
  hold: "Signed by Napoleon Hill.",
  turning: "Turning the page…",
  complete: "Opening workspace.",
  error: "The page could not be written.",
};

const PAGE_TURN_NORMAL_MS = 1250;
const PAGE_TURN_REDUCED_MS = 450;

function isReadabilityAidVisible(phase: Phase, signatureHalfway: boolean): boolean {
  return phase === "hold" || phase === "turning" || phase === "complete" || (phase === "signature" && signatureHalfway);
}

export function prepareQuote(text: string): string {
  const uppercase = text.replace(/\r\n?/g, "\n").trim().toUpperCase();
  if (!uppercase) throw new Error("Enter a quote before playing.");
  const unsupported = [...new Set([...uppercase].filter(ch => ch !== "\n" && !(ch in printFont.glyphData)))];
  if (unsupported.length) {
    throw new Error(
      `This handwriting has no glyph for: ${unsupported
        .map(ch => `“${ch}” (U+${ch.codePointAt(0)!.toString(16).toUpperCase()})`)
        .join(", ")}. Use supported letters, digits, and punctuation.`,
    );
  }
  return uppercase;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}

export interface ClosingSequenceProps {
  config?: ClosingConfig;
  debug?: boolean;
  onComplete?: () => void;
}

/** Opening handwriting sequence: Fast uppercase quote (no pen), exact 2s pause,
 * unhurried signature with dip pen, 1s hold, and page-turn to black. */
export function ClosingSequence({ config = closingConfig, debug = false, onComplete }: ClosingSequenceProps) {
  const paper = useRef<HTMLElement>(null);
  const quoteHost = useRef<HTMLDivElement>(null);
  const signatureHost = useRef<HTMLDivElement>(null);
  const penCanvas = useRef<HTMLCanvasElement>(null);
  const diagnostics = useRef<HTMLOutputElement>(null);
  const engines = useRef<{ quote: TegakiEngine; signature: TegakiEngine } | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const phaseRef = useRef<Phase>("loading");
  const [signatureHalfway, setSignatureHalfway] = useState(false);
  const signatureHalfwayRef = useRef(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const completedCallback = useRef(onComplete);
  completedCallback.current = onComplete;
  const completeTurnRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let timerFrame = 0;
    let pauseRemaining = config.signaturePause;
    let holdRemaining = config.endHold;
    type Part = "quote" | "signature";
    const spaces: Partial<Record<Part, { matrix: DOMMatrix; canvas: HTMLCanvasElement }>> = {};
    const images: Partial<Record<Part, HTMLImageElement>> = {};

    const clearPen = () => {
      const canvas = penCanvas.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    };

    let quote: string;
    const syncSignatureHalfway = (next: boolean) => {
      if (disposed || signatureHalfwayRef.current === next) return;
      signatureHalfwayRef.current = next;
      setSignatureHalfway(next);
    };

    const changePhase = (next: Phase) => {
      if (disposed) return;
      phaseRef.current = next;
      setPhase(next);
      if (next !== "signature") clearPen();
      if (next === "loading" || next === "quote" || next === "pause" || next === "error") {
        syncSignatureHalfway(false);
      }
      if (paper.current && debug) paper.current.dataset.phase = next;
    };

    syncSignatureHalfway(false);
    changePhase("loading");
    setError("");
    try {
      quote = prepareQuote(config.quote);
      if (!Number.isFinite(config.quoteSpeed) || config.quoteSpeed <= 0) throw new Error("Quote speed must be greater than zero.");
      if (!Number.isFinite(config.signatureSpeed) || config.signatureSpeed <= 0) throw new Error("Signature speed must be greater than zero.");
      if (!Number.isFinite(config.signaturePause) || config.signaturePause < 0) throw new Error("Signature pause must be zero or greater.");
      if (!Number.isFinite(config.endHold) || config.endHold < 0) throw new Error("Final hold must be zero or greater.");
      if (!Number.isFinite(config.pen.length) || config.pen.length <= 0) throw new Error("Pen length must be greater than zero.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      changePhase("error");
      return;
    }

    const toViewport = (part: Part, point: PenPoint): PenPoint | null => {
      const space = spaces[part];
      if (!space) return null;
      const rect = space.canvas.getBoundingClientRect();
      const matrix = space.matrix;
      return {
        x: rect.left + ((matrix.a * point.x + matrix.c * point.y + matrix.e) * rect.width) / space.canvas.width,
        y: rect.top + ((matrix.b * point.x + matrix.d * point.y + matrix.f) * rect.height) / space.canvas.height,
      };
    };

    const writeDiagnostics = (part: Part, frame: TegakiFrame, viewport: PenPosition | null, penVisible: boolean, imageReady: boolean) => {
      if (!debug || !paper.current) return;
      const engine = engines.current?.[part];
      const active = frame.active[0];
      const head = active?.head;
      const data = {
        part,
        phase: phaseRef.current,
        reduced,
        time: frame.time,
        duration: engine?.duration ?? 0,
        activeStroke: active?.id ?? null,
        head: head ? { x: head.x, y: head.y } : null,
        nibTip: penVisible ? viewport?.point ?? null : null,
        penVisible,
        penReady: imageReady,
        penMode: viewport?.state ?? "held",
        penDown: penVisible && viewport?.state === "penDown",
        penTravel: viewport
          ? {
              from: viewport.from,
              to: viewport.to,
              progress: viewport.progress,
              lift: viewport.lift,
              start: viewport.start,
              end: viewport.end,
              previousStroke: viewport.previousStroke,
              nextStroke: viewport.nextStroke,
            }
          : null,
        quoteTime: engines.current?.quote.currentTime ?? 0,
        quoteDuration: engines.current?.quote.duration ?? 0,
        signatureTime: engines.current?.signature.currentTime ?? 0,
        signatureDuration: engines.current?.signature.duration ?? 0,
        signatureHalfway: signatureHalfwayRef.current,
        labelVisible: isReadabilityAidVisible(phaseRef.current, signatureHalfwayRef.current),
        pauseRemaining,
        holdRemaining,
      };
      paper.current.dataset.diagnostics = JSON.stringify(data);
      if (diagnostics.current) diagnostics.current.value = JSON.stringify(data, null, 2);
    };

    const renderPen = (part: Part, frame: TegakiFrame) => {
      if (disposed) return;
      const currentPhase = phaseRef.current;
      // Derive the 50% label threshold directly from Tegaki's signature timeline
      // so speed changes, pauses, and responsive reflows stay aligned with ink progress.
      if (part === "signature" && currentPhase === "signature") {
        const signatureDuration = engines.current?.signature.duration ?? 0;
        syncSignatureHalfway(signatureDuration > 0 && frame.time >= signatureDuration * 0.5);
      }
      // Only show the pen while signing the signature (never during quote, pause, hold, turning, or reduced motion).
      if (currentPhase !== "signature") {
        clearPen();
        if ((currentPhase === "quote" || currentPhase === "pause") && part === "quote") {
          writeDiagnostics(part, frame, null, false, Boolean(images.signature ?? images.quote));
        } else if (part === "signature") {
          writeDiagnostics(part, frame, null, false, Boolean(images.signature ?? images.quote));
        }
        return;
      }
      if (part !== "signature") return;

      const canvas = penCanvas.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(canvas.width / rect.width, 0, 0, canvas.height / rect.height, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const position = penPosition(frame);
      let viewport: PenPosition | null = null;
      if (position) {
        const point = toViewport("signature", position.point);
        const from = toViewport("signature", position.from);
        const to = toViewport("signature", position.to);
        if (point && from && to) viewport = { ...position, point, from, to };
      }
      const image = images.signature ?? images.quote ?? null;
      const penVisible = !!viewport && !!image && config.pen.visible && !reduced;
      if (penVisible && image && viewport) {
        drawDipPen(ctx, image, config.pen, { x: viewport.point.x - rect.left, y: viewport.point.y - rect.top });
      }
      writeDiagnostics("signature", frame, viewport, penVisible, !!image);
    };

    const observe = (part: Part) => (paint: TegakiPaintContext, image: HTMLImageElement | null) => {
      if (disposed) return;
      spaces[part] = { matrix: paint.ctx.getTransform(), canvas: paint.ctx.canvas };
      if (image) images[part] = image;
      renderPen(part, paint.frame);
    };

    const penFailure = (reason: Error) => {
      if (disposed) return;
      changePhase("error");
      setError(reason.message);
      cancelAnimationFrame(timerFrame);
      engines.current?.quote.update({ time: { mode: "uncontrolled", playing: false, speed: config.quoteSpeed, loop: false } });
      engines.current?.signature.update({ time: { mode: "uncontrolled", playing: false, speed: config.signatureSpeed, loop: false } });
    };

    const completeSequence = () => {
      if (disposed || phaseRef.current === "complete") return;
      changePhase("complete");
      cancelAnimationFrame(timerFrame);
      const sig = engines.current?.signature;
      if (sig) writeDiagnostics("signature", sig.frameAt(), null, false, Boolean(images.signature ?? images.quote));
      completedCallback.current?.();
    };
    completeTurnRef.current = completeSequence;

    const startPageTurn = () => {
      if (disposed || phaseRef.current === "turning" || phaseRef.current === "complete") return;
      changePhase("turning");
      const turnDurationMs = reduced ? PAGE_TURN_REDUCED_MS : PAGE_TURN_NORMAL_MS;
      const turnStart = performance.now();
      const safetyDeadlineMs = turnDurationMs + 300;
      const tickTurn = (now: number) => {
        if (disposed || phaseRef.current !== "turning") return;
        const sig = engines.current?.signature;
        if (sig) writeDiagnostics("signature", sig.frameAt(), null, false, Boolean(images.signature ?? images.quote));
        if (now - turnStart >= safetyDeadlineMs) completeSequence();
        else timerFrame = requestAnimationFrame(tickTurn);
      };
      timerFrame = requestAnimationFrame(tickTurn);
    };

    const startEndHold = () => {
      if (disposed || phaseRef.current === "hold" || phaseRef.current === "turning" || phaseRef.current === "complete") return;
      changePhase("hold");
      holdRemaining = config.endHold;
      const holdStart = performance.now();
      if (holdRemaining <= 0) {
        startPageTurn();
        return;
      }
      const tickHold = (now: number) => {
        if (disposed || phaseRef.current !== "hold") return;
        holdRemaining = Math.max(0, config.endHold - (now - holdStart) / 1000);
        if (paper.current && debug) paper.current.dataset.holdRemaining = holdRemaining.toFixed(3);
        const sig = engines.current?.signature;
        if (sig) writeDiagnostics("signature", sig.frameAt(), null, false, Boolean(images.signature ?? images.quote));
        if (holdRemaining <= 0) startPageTurn();
        else timerFrame = requestAnimationFrame(tickHold);
      };
      timerFrame = requestAnimationFrame(tickHold);
    };

    const startSignature = () => {
      if (disposed || phaseRef.current !== "pause") return;
      changePhase("signature");
      const sig = engines.current?.signature;
      if (!sig) return;
      sig.update({ time: { mode: "uncontrolled", playing: true, speed: config.signatureSpeed, loop: false } });
      renderPen("signature", sig.frameAt(0));
    };

    const quoteComplete = () => {
      if (disposed || phaseRef.current !== "quote") return;
      changePhase("pause");
      pauseRemaining = config.signaturePause;
      const pauseStart = performance.now();
      if (pauseRemaining <= 0) {
        startSignature();
        return;
      }
      const tickPause = (now: number) => {
        if (disposed || phaseRef.current !== "pause") return;
        pauseRemaining = Math.max(0, config.signaturePause - (now - pauseStart) / 1000);
        if (paper.current && debug) paper.current.dataset.pauseRemaining = pauseRemaining.toFixed(3);
        const current = engines.current;
        if (current) renderPen("quote", current.quote.frameAt());
        if (pauseRemaining <= 0) startSignature();
        else timerFrame = requestAnimationFrame(tickPause);
      };
      timerFrame = requestAnimationFrame(tickPause);
    };

    // Both local faces are loaded before either engine starts. Loading a failed
    // font must surface an error instead of silently laying out fallback text.
    Promise.all([TegakiEngine.preload(printFont), TegakiEngine.preload(signatureFont)])
      .then(() => {
        if (disposed || !quoteHost.current || !signatureHost.current) return;
        for (const font of [printFont, signatureFont]) {
          if (![...document.fonts].some(face => face.family.replace(/["']/g, "") === font.family && face.status === "loaded")) {
            throw new Error(`The local handwriting font did not load: ${font.family}. Reload to try again.`);
          }
        }
        const hiddenPen = { ...config.pen, visible: false };
        const activePen = { ...config.pen, visible: config.pen.visible && !reduced };
        const baseTiming = {
          glyphGap: 0.055,
          wordGap: 0.16,
          lineGap: 0.3,
          deferDots: false,
          strokeEasing: (t: number) => t,
        };
        const quoteEngine = new TegakiEngine(quoteHost.current, {
          shaper: false,
          pressure: 1,
          reducedMotion: "never",
          quality: { clipText: 2.5 },
          timing: baseTiming,
          text: quote,
          font: printFont,
          time: reduced ? "100%" : { mode: "uncontrolled", playing: false, speed: config.quoteSpeed, loop: false },
          plugins: [dipPenPlugin(hiddenPen, observe("quote"), penFailure)],
          onComplete: quoteComplete,
        });
        const signatureEngine = new TegakiEngine(signatureHost.current, {
          shaper: false,
          pressure: 1,
          reducedMotion: "never",
          quality: { clipText: 1.25 },
          timing: baseTiming,
          text: "\uE000",
          font: signatureFont,
          time: reduced ? "100%" : { mode: "uncontrolled", playing: false, speed: config.signatureSpeed, loop: false },
          plugins: [dipPenPlugin(activePen, observe("signature"), penFailure)],
          onComplete: () => {
            if (phaseRef.current === "signature") startEndHold();
          },
        });
        engines.current = { quote: quoteEngine, signature: signatureEngine };
        if (reduced) {
          startEndHold();
        } else {
          changePhase("quote");
          quoteEngine.update({ time: { mode: "uncontrolled", playing: true, speed: config.quoteSpeed, loop: false } });
        }
      })
      .catch(reason => {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        changePhase("error");
      });

    return () => {
      disposed = true;
      completeTurnRef.current = () => {};
      cancelAnimationFrame(timerFrame);
      clearPen();
      engines.current?.quote.destroy();
      engines.current?.signature.destroy();
      engines.current = null;
      quoteHost.current?.replaceChildren();
      signatureHost.current?.replaceChildren();
    };
  }, [config, reduced, debug]);

  const showSignature = phase === "signature" || phase === "hold" || phase === "turning" || phase === "complete";
  const showReadabilityAid = isReadabilityAidVisible(phase, signatureHalfway);
  const handlePaperAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || phaseRef.current !== "turning") return;
    if (event.animationName === "hill-page-rotate" || event.animationName === "hill-page-dissolve-reduced") {
      completeTurnRef.current();
    }
  };
  const paperStyle = {
    color: config.ink,
    "--hill-turn-duration": `${PAGE_TURN_NORMAL_MS}ms`,
    "--hill-turn-reduced-duration": `${PAGE_TURN_REDUCED_MS}ms`,
  } as CSSProperties;

  return (
    <section className="hill-closing" aria-label="Napoleon Hill opening quotation">
      <article
        className="hill-paper"
        ref={paper}
        data-closing-phase={phase}
        onAnimationEnd={handlePaperAnimationEnd}
        style={paperStyle}
      >
        <canvas className="hill-pen-surface" ref={penCanvas} aria-hidden="true" />
        <blockquote className="hill-quotation">
          <p className="hill-sr-only">{config.quote}</p>
          <div className="hill-print" ref={quoteHost} aria-hidden="true" />
        </blockquote>
        <div className="hill-attribution">
          <div className="hill-signature-stack">
            <div
              className="hill-signature"
              ref={signatureHost}
              aria-hidden="true"
              style={{ visibility: showSignature ? "visible" : "hidden" }}
            />
            <div className="hill-signature-aid">
              <span className={showReadabilityAid ? "hill-signature-label" : "hill-sr-only"}>Napoleon Hill</span>
            </div>
          </div>
        </div>
        <p className="hill-sr-only" role="status" aria-live="polite">
          {reduced && phase === "hold" ? "Quote and signature displayed with reduced motion." : statusLabel[phase]}
        </p>
        {error && (
          <div className="hill-error">
            <p role="alert">{error}</p>
            {onComplete && <button type="button" onClick={onComplete}>Continue to onboarding</button>}
          </div>
        )}
      </article>
      {debug && (
        <details className="hill-debug" open>
          <summary>Renderer diagnostics</summary>
          <output ref={diagnostics} />
        </details>
      )}
    </section>
  );
}
