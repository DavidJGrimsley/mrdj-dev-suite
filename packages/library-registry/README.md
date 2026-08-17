# @mr.dj2u/library-registry

Typed, source-copy registry for completed Expo components, animations, screens,
flows, and integrations used by Mr. DJ's Dev Suite.

```ts
import {
  getLibraryItem,
  listLibraryItems,
  readLibraryAsset,
  resolveLibraryItem,
  searchLibraryItems,
} from "@mr.dj2u/library-registry";
```

Catalog metadata is synchronous. `readLibraryAsset` returns a `Buffer` so text
and binary assets can both be restored without corruption.

```ts
const resolution = resolveLibraryItem("swmansion/animated-pressable", {
  expoSdk: 56,
  appDirectory: "src/app",
  componentsDirectory: "src/components",
  featuresDirectory: "src/features",
  navigation: "expo-router",
  navigationLayout: "stack",
  aliases: { "@": "./src" },
});

for (const asset of resolution.assets) {
  const contents = await readLibraryAsset(asset);
  // Preflight asset.destination, then copy contents without overwriting custom files.
}
```

Supported destination tokens are `{{appDir}}`, `{{componentsDir}}`, and
`{{featuresDir}}`. Content is copied byte-for-byte except for placeholders
explicitly declared in an asset's `contentTokens` metadata. V1 declares only
`__MDS_APP_NAME__` in the canonical Stylist template.

The registry does not track installation history and does not implement
authentication. See `THIRD_PARTY_NOTICES.md` for snapshot provenance.

See `docs/database-adapter.md` for the generated app database adapter contract
and provider variant expectations.
