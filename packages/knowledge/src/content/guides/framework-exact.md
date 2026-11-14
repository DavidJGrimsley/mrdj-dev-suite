# Exact projects

Exact uses Contract for views, with TypeScript or Rust data logic. It is a source-checkout toolchain. Read the README, `docs/start-here.md`, upstream agent instructions and CLI help **at the revision in the approved plan**. Platform maturity and commands belong to that revision, not an assumed current release.

The official workflow includes `bun scripts/exact.mjs new <destination>` in the checkout, then `bun exact.mjs web` and `bun exact.mjs test web` in the app. Inspect the pinned help before adding flags. `setup --check` diagnoses setup without installing. Setup itself mutates toolchains and needs approval. Missing Bun, Rust, Chrome or target SDKs must remain actionable prerequisites. Windows availability is not proof that Apple or native Windows operations work.

Use the official templates catalog and each selected template's `TEMPLATE.md` and `exact.json`. Chat, Landscapes and Softwear have independent pins and limitations. Invoke their pinned `new.mjs`; never copy template app files directly. Review assets, branding and backend requirements before adapting an example. Reuse a matching checkout rather than installing one per app.

Android is experimental, with distribution/store packaging unfinished in the inspected upstream documentation. Verify every requested host against the pinned metadata. Run available Contract tests and inspect actual generated files; an exit code alone is insufficient. Preserve `AGENTS.md`, `CLAUDE.md`, Cargo paths and generated launcher files. Checkouts referenced by path require an explicit relocation strategy.

Do not apply React, Expo Router, Metro, EAS, NativeWind, Uniwind or Expo Doctor assumptions. Exact errors are Exact diagnostics. Upstream feedback transmission is a separate privacy decision; iSquared does not approve or send it by default.

Sources: [Exact README](https://github.com/expo/exact), [start here](https://github.com/expo/exact/blob/main/docs/start-here.md), [official template instructions](https://github.com/expo/exact-templates/blob/main/AGENTS.md). Resolve these links at the immutable revisions recorded by the generator before use.
