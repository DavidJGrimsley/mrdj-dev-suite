// Keyboard containment for modal layers: Tab and Shift+Tab wrap inside `container`, and focus
// that has escaped (to the page behind, or to <body>) is pulled back to the first control.

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert], [aria-hidden='true']"),
  );
}

/** Call from a keydown listener. Returns true when it moved focus. */
export function trapTabKey(container: HTMLElement | null, event: KeyboardEvent): boolean {
  if (!container || event.key !== "Tab") return false;
  const items = focusables(container);
  if (items.length === 0) {
    event.preventDefault();
    container.focus({ preventScroll: true });
    return true;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = active instanceof Node && container.contains(active);
  if (!inside || (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
    return true;
  }
  return false;
}

/** Focus `el` if it is still in the document. */
export function restoreFocus(el: Element | null | undefined): void {
  if (el instanceof HTMLElement && el.isConnected) el.focus({ preventScroll: true });
}
