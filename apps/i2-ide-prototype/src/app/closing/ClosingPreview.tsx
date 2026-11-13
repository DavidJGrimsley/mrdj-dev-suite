import { ClosingSequence } from "./ClosingSequence";
import { closingConfig } from "./closingConfig";

/** Direct route: /closing (also ?closing=1). Exercises the exact opening sequence over black. */
export default function ClosingPreview() {
  const debug = new URLSearchParams(window.location.search).get("debug") === "1";
  return (
    <main className="hill-preview">
      <ClosingSequence config={closingConfig} debug={debug} />
    </main>
  );
}
