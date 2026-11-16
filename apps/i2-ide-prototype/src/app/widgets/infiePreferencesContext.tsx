import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";

export interface PreferenceStop {
  index: number;
  value: number;
  label: string;
  description: string;
}

export const GUIDANCE_STOPS: PreferenceStop[] = [
  {
    index: 0,
    value: 0,
    label: "Ask Every Step",
    description: "Clearly asks and confirms every step before taking any action",
  },
  {
    index: 1,
    value: 25,
    label: "Guided",
    description: "Frequent check-ins with suggested next steps and confirmations on most actions",
  },
  {
    index: 2,
    value: 50,
    label: "Balanced",
    description: "Balanced assistance with confirmations for major decisions and milestones",
  },
  {
    index: 3,
    value: 80,
    label: "Autonomous",
    description: "Proactive execution and high initiative, checking in only when necessary",
  },
  {
    index: 4,
    value: 100,
    label: "Act on my behalf",
    description: "Fully independent operation; acts directly on your behalf without step-by-step approvals",
  },
];

export const SASSINESS_STOPS: PreferenceStop[] = [
  {
    index: 0,
    value: 0,
    label: "None",
    description: "No jokes or sarcasm; strictly objective, formal, and direct responses without banter",
  },
  {
    index: 1,
    value: 25,
    label: "Polite",
    description: "Friendly, courteous, and polite tone with subtle warmth",
  },
  {
    index: 2,
    value: 50,
    label: "Playful",
    description: "Lighthearted banter, casual phrasing, and occasional witty notes",
  },
  {
    index: 3,
    value: 75,
    label: "Sarcastic",
    description: "Sharp dry humor, mild teasing, and tongue-in-cheek remarks",
  },
  {
    index: 4,
    value: 100,
    label: "Very Sarcastic",
    description: "Maximum snark, unsparing roasts, and spicy quips",
  },
];

export const VERBOSITY_STOPS: PreferenceStop[] = [
  {
    index: 0,
    value: 0,
    label: "Natural",
    description: "Natural, short-and-sweet conversational responses without unnecessary fluff (provisional default)",
  },
  {
    index: 1,
    value: 25,
    label: "Crisp",
    description: "Condensed explanations focused tightly on direct actions",
  },
  {
    index: 2,
    value: 50,
    label: "Terse",
    description: "Bullet-style fragments and essential checkpoints only",
  },
  {
    index: 3,
    value: 75,
    label: "Telegraphic",
    description: "Ultra-condensed syntax, omitting auxiliary words",
  },
  {
    index: 4,
    value: 100,
    label: "Caveman",
    description: "Bare keywords, raw tokens, and caveman-style micro-fragments",
  },
];

export const TECHNICAL_LEVEL_STOPS: PreferenceStop[] = [
  {
    index: 0,
    value: 0,
    label: "Plain Language",
    description: "Beginner and vibe-coder friendly concepts in everyday plain language",
  },
  {
    index: 1,
    value: 25,
    label: "Practical",
    description: "Standard developer terminology and common pragmatic patterns",
  },
  {
    index: 2,
    value: 50,
    label: "Experienced",
    description: "Idiomatic software engineering patterns, system contracts, and architecture idioms (provisional default)",
  },
  {
    index: 3,
    value: 75,
    label: "Specialist",
    description: "Deep systems focus covering concurrency, memory models, and runtime internals",
  },
  {
    index: 4,
    value: 100,
    label: "Principal",
    description: "Tenured staff and principal engineering abstractions, formal correctness, and deep architectural trade-offs",
  },
];

export const TEXT_SPEED_STOPS: PreferenceStop[] = [
  {
    index: 0,
    value: 0,
    label: "Slow",
    description: "Deliberate and steady reading pacing for careful comprehension",
  },
  {
    index: 1,
    value: 50,
    label: "Normal",
    description: "Natural conversational stream cadence and balanced reading flow (provisional default)",
  },
  {
    index: 2,
    value: 100,
    label: "Fast",
    description: "Brisk text reveal for rapid skimming and quick scanning",
  },
];

export interface InfiePreferencesState {
  /** Guidance stop index (0..4). Default is 3 (value: 80, Autonomous). */
  guidanceStopIndex: number;
  /** Sassiness stop index (0..4). Default is 4 (value: 100, Very Sarcastic). */
  sassinessStopIndex: number;
  /** Verbosity stop index (0..4). Default is 0 (value: 0, Natural provisional short-and-sweet). */
  verbosityStopIndex: number;
  /** Technical Level stop index (0..4). Default is 2 (Experienced, provisional middle). */
  technicalLevelStopIndex: number;
  /** Text Speed stop index (0..2). Default is 1 (Normal, provisional middle). */
  textSpeedStopIndex: number;
}

export interface InfiePreferencesContextValue {
  preferences: InfiePreferencesState;
  guidanceStop: PreferenceStop;
  sassinessStop: PreferenceStop;
  verbosityStop: PreferenceStop;
  technicalLevelStop: PreferenceStop;
  textSpeedStop: PreferenceStop;
  setGuidanceStopIndex: (index: number) => void;
  setSassinessStopIndex: (index: number) => void;
  setVerbosityStopIndex: (index: number) => void;
  setTechnicalLevelStopIndex: (index: number) => void;
  setTextSpeedStopIndex: (index: number) => void;
  resetDefaults: () => void;
}

const DEFAULT_PREFERENCES: InfiePreferencesState = {
  guidanceStopIndex: 3, // Default 80 (explicit 4th of 5 stops: Autonomous)
  sassinessStopIndex: 4, // Default 100 (Very Sarcastic)
  verbosityStopIndex: 0, // Default 0 (Natural short-and-sweet)
  technicalLevelStopIndex: 2, // Default middle level (Experienced, provisional)
  textSpeedStopIndex: 1, // Default middle level (Normal, provisional)
};

const InfiePreferencesContext = createContext<InfiePreferencesContextValue | null>(null);

export function InfiePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<InfiePreferencesState>(DEFAULT_PREFERENCES);

  const guidanceStop = GUIDANCE_STOPS[preferences.guidanceStopIndex] ?? GUIDANCE_STOPS[3];
  const sassinessStop = SASSINESS_STOPS[preferences.sassinessStopIndex] ?? SASSINESS_STOPS[4];
  const verbosityStop = VERBOSITY_STOPS[preferences.verbosityStopIndex] ?? VERBOSITY_STOPS[0];
  const technicalLevelStop = TECHNICAL_LEVEL_STOPS[preferences.technicalLevelStopIndex] ?? TECHNICAL_LEVEL_STOPS[2];
  const textSpeedStop = TEXT_SPEED_STOPS[preferences.textSpeedStopIndex] ?? TEXT_SPEED_STOPS[1];

  const setGuidanceStopIndex = (index: number) => {
    setPreferences((prev) => ({ ...prev, guidanceStopIndex: Math.max(0, Math.min(GUIDANCE_STOPS.length - 1, index)) }));
  };

  const setSassinessStopIndex = (index: number) => {
    setPreferences((prev) => ({ ...prev, sassinessStopIndex: Math.max(0, Math.min(SASSINESS_STOPS.length - 1, index)) }));
  };

  const setVerbosityStopIndex = (index: number) => {
    setPreferences((prev) => ({ ...prev, verbosityStopIndex: Math.max(0, Math.min(VERBOSITY_STOPS.length - 1, index)) }));
  };

  const setTechnicalLevelStopIndex = (index: number) => {
    setPreferences((prev) => ({ ...prev, technicalLevelStopIndex: Math.max(0, Math.min(TECHNICAL_LEVEL_STOPS.length - 1, index)) }));
  };

  const setTextSpeedStopIndex = (index: number) => {
    setPreferences((prev) => ({ ...prev, textSpeedStopIndex: Math.max(0, Math.min(TEXT_SPEED_STOPS.length - 1, index)) }));
  };

  const resetDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const value = useMemo<InfiePreferencesContextValue>(
    () => ({
      preferences,
      guidanceStop,
      sassinessStop,
      verbosityStop,
      technicalLevelStop,
      textSpeedStop,
      setGuidanceStopIndex,
      setSassinessStopIndex,
      setVerbosityStopIndex,
      setTechnicalLevelStopIndex,
      setTextSpeedStopIndex,
      resetDefaults,
    }),
    [preferences, guidanceStop, sassinessStop, verbosityStop, technicalLevelStop, textSpeedStop]
  );

  return (
    <InfiePreferencesContext.Provider value={value}>
      {children}
    </InfiePreferencesContext.Provider>
  );
}

export function useInfiePreferences(): InfiePreferencesContextValue {
  const ctx = useContext(InfiePreferencesContext);
  if (!ctx) {
    // Graceful fallback if rendered outside provider
    const defGuidance = GUIDANCE_STOPS[3];
    const defSassiness = SASSINESS_STOPS[4];
    const defVerbosity = VERBOSITY_STOPS[0];
    const defTech = TECHNICAL_LEVEL_STOPS[2];
    const defSpeed = TEXT_SPEED_STOPS[1];
    return {
      preferences: DEFAULT_PREFERENCES,
      guidanceStop: defGuidance,
      sassinessStop: defSassiness,
      verbosityStop: defVerbosity,
      technicalLevelStop: defTech,
      textSpeedStop: defSpeed,
      setGuidanceStopIndex: () => {},
      setSassinessStopIndex: () => {},
      setVerbosityStopIndex: () => {},
      setTechnicalLevelStopIndex: () => {},
      setTextSpeedStopIndex: () => {},
      resetDefaults: () => {},
    };
  }
  return ctx;
}

export function checkReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Hook to subscribe dynamically to changes in prefers-reduced-motion.
 * Cleans up media query listener when unmounted.
 */
export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => checkReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return reducedMotion;
}

/**
 * Gate helper for parent containers that need to show actions or advance after text reveal.
 * - Reduced motion initializes synchronously to true, avoiding effect-order races or hidden Continue.
 * - Normal motion initializes synchronously to false, avoiding first-paint flashes.
 * - When text changes, state updates during render to eliminate passive-effect race conditions.
 * - Subscribes to prefers-reduced-motion so enabling reduce mid-reveal releases the gate immediately.
 */
export function useTextRevealGate(text: string, messageKey?: string) {
  const reducedMotion = usePrefersReducedMotion();
  const token = messageKey !== undefined ? `${messageKey}::${text}` : text;
  const [prevToken, setPrevToken] = useState(token);
  const [isComplete, setIsComplete] = useState(() => reducedMotion || !text);

  // Sync state during render when text/message changes
  const isChanged = prevToken !== token;
  if (isChanged) {
    setPrevToken(token);
    setIsComplete(reducedMotion || !text);
  }

  const effectiveComplete = reducedMotion || !text ? true : isChanged ? false : isComplete;

  // If reduced motion is turned on mid-reveal, release gate immediately
  useEffect(() => {
    if (reducedMotion && !isComplete) {
      setIsComplete(true);
    }
  }, [reducedMotion, isComplete]);

  const onComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  return { isComplete: effectiveComplete, onComplete, setIsComplete };
}

/**
 * Custom hook to reveal text progressively according to the user's text speed preference.
 * Respects `prefers-reduced-motion` dynamically without an initial blank frame.
 * Changing speed mid-message continues from the current character rather than restarting.
 */
export function useRevealedText(fullText: string, options?: { enabled?: boolean; onComplete?: () => void }) {
  const { textSpeedStop } = useInfiePreferences();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = options?.enabled ?? true;
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;

  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;

  const [prevText, setPrevText] = useState(fullText);
  // Reduced-motion users should see full text on first render, without an initial blank frame.
  const [revealedLength, setRevealedLength] = useState<number>(() => {
    if (!enabled || reducedMotion) return fullText.length;
    return 0;
  });

  // If text prop changed during render, sync state immediately without mutating refs during render
  const textChanged = prevText !== fullText;
  if (textChanged) {
    setPrevText(fullText);
    const initialLen = (!enabled || reducedMotion) ? fullText.length : 0;
    setRevealedLength(initialLen);
  }

  const currentLength = (!enabled || reducedMotion)
    ? fullText.length
    : textChanged
    ? 0
    : revealedLength;

  const revealedLengthRef = useRef(currentLength);
  revealedLengthRef.current = currentLength;

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setRevealedLength(fullText.length);
      revealedLengthRef.current = fullText.length;
      onCompleteRef.current?.();
      return;
    }

    let current = revealedLengthRef.current;

    if (current >= fullText.length) {
      onCompleteRef.current?.();
      return;
    }

    // Speed pacing in ms per character
    // Slow (0): ~38ms, Normal (1): ~18ms, Fast (2): ~6ms
    const speedMs = textSpeedStop.index === 0 ? 38 : textSpeedStop.index === 2 ? 6 : 18;

    const interval = window.setInterval(() => {
      current += 1;
      setRevealedLength(current);
      revealedLengthRef.current = current;
      if (current >= fullTextRef.current.length) {
        window.clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, speedMs);

    return () => window.clearInterval(interval);
  }, [fullText, textSpeedStop.index, enabled, reducedMotion]);

  return fullText.slice(0, currentLength);
}

/**
 * Text component that reveals assistant text according to the active speed preference.
 * - Screen readers receive the static full text once via an accessible sr-only wrapper
 *   (and optional stable polite live region when `live` is true).
 * - Sighted users see progressive character reveals with pointer click-to-reveal,
 *   while keyboard/AT users get a separate accessible "Reveal full text" button outside the live region.
 * - Supports onComplete callback when text is fully displayed.
 */
export function RevealingInfieText({
  text,
  enabled = true,
  live = false,
  className = "",
  onComplete,
}: {
  text: string;
  enabled?: boolean;
  live?: boolean;
  className?: string;
  onComplete?: () => void;
}) {
  const [prevText, setPrevText] = useState(text);
  const [skip, setSkip] = useState(false);

  if (prevText !== text) {
    setPrevText(text);
    setSkip(false);
  }

  const effectiveSkip = prevText === text && skip;

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const handleSkip = () => {
    setSkip(true);
    handleComplete();
  };

  const revealed = useRevealedText(text, {
    enabled: enabled && !effectiveSkip,
    onComplete: handleComplete,
  });

  const isRevealing = enabled && !effectiveSkip && revealed.length < text.length;

  return (
    <span className={`inline ${className}`} data-text-reveal={isRevealing ? "revealing" : "complete"}>
      <span
        className="sr-only"
        role={live ? "status" : undefined}
        aria-live={live ? "polite" : undefined}
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        data-revealed-text
        className={isRevealing ? "cursor-pointer" : undefined}
        onClick={isRevealing ? handleSkip : undefined}
        title={isRevealing ? "Click to show full text" : undefined}
      >
        {effectiveSkip ? text : revealed}
      </span>
      {isRevealing && (
        <button
          type="button"
          onClick={handleSkip}
          className="sr-only focus:not-sr-only focus:inline-block focus:ml-1.5 focus:px-1.5 focus:py-0.5 focus:rounded focus:bg-[#2dd4bf]/20 focus:text-[#2dd4bf] focus:text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2dd4bf]"
        >
          Reveal full text
        </button>
      )}
    </span>
  );
}
