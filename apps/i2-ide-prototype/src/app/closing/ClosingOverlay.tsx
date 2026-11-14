import { useEffect, useRef } from "react";
import { ClosingSequence } from "./ClosingSequence";

/** Opening presentation layer over pure black before the first-run tutorial begins. */
export function ClosingOverlay({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const debug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const siblings = [...(node.parentElement?.children ?? [])]
      .filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement && sibling !== node)
      .map(sibling => ({ sibling, inert: sibling.inert }));
    siblings.forEach(({ sibling }) => {
      sibling.inert = true;
    });
    node.focus({ preventScroll: true });

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
    };
    node.addEventListener("keydown", keydown);
    return () => {
      node.removeEventListener("keydown", keydown);
      siblings.forEach(({ sibling, inert }) => {
        sibling.inert = inert;
      });
      if (previousFocus?.isConnected && previousFocus !== document.body) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      className="hill-closing-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Napoleon Hill opening quotation"
    >
      <ClosingSequence debug={debug} onComplete={onClose} />
    </div>
  );
}
