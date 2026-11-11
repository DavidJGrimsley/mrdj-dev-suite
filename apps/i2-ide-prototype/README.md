# i² IDE prototype (iSquared Agentic IDE design)

Standalone Vite + React 18 + Tailwind 4 prototype of the i² dual-screen IDE and the Infie onboarding
tutorial, imported from the Figma Make export `FinalFigmaMake-iSquaredIDE`. It is **not** part of the
root pnpm workspace (`packages/*`) or turbo pipeline; install and run it from this folder.

## Run

Needs Node 22+ and pnpm 10 (the lockfile is v9; see `.mise.toml`, which pins pnpm 10.34.3).

```
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev      # http://localhost:8443 (strict port; override with PORT)
pnpm build    # vite build --config vite.figma.config.ts -> dist/
```

Open `/?beat=B06` to jump to the controls beat, `/?onboarding=1` for the full tutorial from B00.

## What differs from the original Figma Make export

- B06 controls: the three per-device MP4s (`infie-transform-*.mp4`) are replaced by one continuous
  transparent recording, `public/assets/infie-controls-chain-alpha.webm` (VP9 + alpha, 1080x1080,
  30 fps, 16 s, no audio). It is a plain `<video>`; the old canvas luma key (`LumaKeyedVideo.tsx`)
  is no longer used by B06 and is left in place. Cues follow the video's media time: keyboard at 0 s,
  gamepad at 6 s, joystick at 11 s, all three devices when it ends. Reduced motion and any video
  failure (error, no start, stall, no VP9 support) still use the device PNG stills.
- `pnpm-workspace.yaml`: `supportedArchitectures` also lists `current` so installs work on the
  developer's own OS (the export only listed linux).
- The export's `.gitattributes` (Git LFS rules for binary types) is not imported; decide on LFS for
  this repo separately.

The Figma-Make-specific files (`.figma/`, `AGENT-HANDOFF.md`, `plans/`, and the tutorial scripts)
are retained. The current `tutorial-script.md` reflects the new B06 sequence; historical documents
may still describe the original three MP4s.

## Attribution

See `ATTRIBUTIONS.md`: shadcn/ui components used under the MIT license
(https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) and Unsplash photos used under the Unsplash
license (https://unsplash.com/license).

## Known limitation

VP9-with-alpha WebM is honored by Chromium-based browsers (verified in Chrome 156 and Edge 157).
A decoder that drops alpha would show an opaque black square for the B06 video; Safari and Firefox
were not tested.
