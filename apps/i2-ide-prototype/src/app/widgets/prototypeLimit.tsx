// One place to raise the "Prototype Limit" modal from anywhere in the shell: chat sends during
// the onboarding tutorial, projects whose sources are not in the prototype, provider sign-ins.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { PrototypeLimit } from "../components/PrototypeLimit";

export interface PrototypeLimitRequest {
  featureName: string;
  description: string;
  subtitle?: string;
  environmentNote?: string;
  /** Offer "Open Pet Show and Tell" as the place with more interactivity. */
  suggestPet?: boolean;
}

interface LimitContextValue {
  show: (request: PrototypeLimitRequest) => void;
  nav: React.MutableRefObject<{ openPet?: () => void }>;
}

const LimitContext = createContext<LimitContextValue | null>(null);

export function PrototypeLimitProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PrototypeLimitRequest | null>(null);
  const nav = useRef<{ openPet?: () => void }>({});
  const show = useCallback((r: PrototypeLimitRequest) => setRequest(r), []);
  const value = useMemo(() => ({ show, nav }), [show]);
  const close = () => setRequest(null);
  return (
    <LimitContext.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {request && (
            <div key="prototype-limit" className="contents">
              <PrototypeLimit
                variant="modal"
                subtitle={request.subtitle ?? "Interactive Prototype Boundary"}
                featureName={request.featureName}
                description={request.description}
                environmentNote={request.environmentNote}
                primaryAction={{ label: "Got it", onClick: close, variant: "primary" }}
                suggestedActions={
                  request.suggestPet && nav.current.openPet
                    ? [{ label: "Open Pet Show and Tell", onClick: () => { close(); nav.current.openPet?.(); } }]
                    : undefined
                }
                onClose={close}
              />
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </LimitContext.Provider>
  );
}

export function usePrototypeLimit(): (request: PrototypeLimitRequest) => void {
  const ctx = useContext(LimitContext);
  if (!ctx) throw new Error("PrototypeLimitProvider is missing");
  return ctx.show;
}

/** The shell registers how to navigate to the fully wired demo project. */
export function useRegisterPrototypeLimitNav(openPet: () => void) {
  const ctx = useContext(LimitContext);
  if (ctx) ctx.nav.current.openPet = openPet;
}

/** Infie chat is scripted during the onboarding tutorial; free-form messages stop here. */
export const TUTORIAL_CHAT_LIMIT: PrototypeLimitRequest = {
  featureName: "Chat with Infie",
  subtitle: "Onboarding tutorial",
  description:
    "Infie's side of this tutorial is scripted, so free-form messages aren't answered here. Use Continue (or the highlighted control) to keep going. In the full app you can ask Infie anything at any time.",
  environmentNote: "Simulated prototype · no live model calls during the tutorial",
};

/** Not Hotdog is a placeholder project: none of its files are in the prototype. */
export function notHotdogLimit(what: string): PrototypeLimitRequest {
  return {
    featureName: what,
    subtitle: "Not Hotdog · placeholder project",
    description:
      "Not Hotdog is here to show a second project in the list; its files and workspace aren't wired into this prototype. Check out Pet Show and Tell for more interactivity: real project files, a working Explorer and a live web preview.",
    environmentNote: "Simulated prototype · this project's sources are not included",
    suggestPet: true,
  };
}

/** An imported sample project: sessions, files, and simulators stop here. */
export function importedProjectLimit(projectName: string, what: string): PrototypeLimitRequest {
  return {
    featureName: what,
    subtitle: `${projectName} · show-only imported project`,
    description:
      `${projectName} is show-only in this prototype—it illustrates multiple sessions running at once, each with multiple Session Agents coordinated by Infie. Its files, sessions, and simulators aren't wired interactively here.`,
    environmentNote: "Simulated prototype · show-only imported project",
    suggestPet: false,
  };
}
