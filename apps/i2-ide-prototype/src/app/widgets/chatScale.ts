// The zoom applied by `.i2-chat-scale` (src/styles/widgets.css) at the current viewport width.
// Code that positions things beside a zoomed chat surface in viewport px uses it to stay aligned.
export function chatScale(): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth;
  return w >= 2300 ? 1.34 : w >= 1800 ? 1.22 : w >= 1500 ? 1.12 : 1;
}
