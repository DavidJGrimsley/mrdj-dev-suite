import type {
  LibraryAsset,
  LibraryAssetRole,
  LibraryCompatibility,
  LibraryDependency,
  LibraryIntegration,
  LibraryItem,
  LibraryItemKind,
  LibraryPreview,
  LibrarySource,
  LibraryVariant,
} from "./types.js";

const ALL_PLATFORMS = ["android", "ios", "web"] as const;
const SDK_56: LibraryCompatibility = { expoSdk: { min: 56, max: 56 } };
const SDK_56_ROUTER: LibraryCompatibility = {
  ...SDK_56,
  navigation: ["expo-router"],
  platforms: ALL_PLATFORMS,
  aliases: ["@"],
};
const SDK_56_ALIAS: LibraryCompatibility = {
  ...SDK_56,
  aliases: ["@"],
  platforms: ALL_PLATFORMS,
};
const SDK_56_CEA_ASSETS: LibraryCompatibility = {
  ...SDK_56_ALIAS,
  aliases: ["@", "@/assets"],
};
const SDK_56_NATIVEWIND_UI: LibraryCompatibility = {
  ...SDK_56_ALIAS,
  styling: ["nativewindui"],
};

const MDS_SOURCE: LibrarySource = {
  name: "mds",
  displayName: "Mr. DJ's Dev Suite",
  version: "0.1.26",
  license: "MIT",
  repository: "https://github.com/DavidJGrimsley/mrdj-dev-suite",
  sourcePath: "packages/cli",
};

const CEA_SOURCE: LibrarySource = {
  name: "create-expo-app",
  displayName: "Expo create-expo-app default template",
  version: "56.0.4",
  license: "MIT",
  repository:
    "https://github.com/expo/expo/tree/main/templates/expo-template-default",
  sourcePath: "test-apps/create-expo-app-test1",
};

const CES_SOURCE: LibrarySource = {
  name: "create-expo-stack",
  displayName: "create-expo-stack",
  version: "2.21.3",
  license: "MIT",
  repository: "https://github.com/roninoss/create-expo-stack",
  sourcePath: "build/templates/base/components",
};

const CES_MDS_SOURCE: LibrarySource = {
  name: "nativewindui",
  displayName: "NativeWindUI via create-expo-stack",
  version: "2.21.3-mrdj.2",
  license: "MIT",
  repository: "https://github.com/roninoss/create-expo-stack",
  sourcePath: "test-apps/56test-agentic/src/components/nativewindui",
};

const SOFTWARE_MANSION_DEMO_SOURCE: LibrarySource = {
  name: "swmansion",
  displayName: "Software Mansion package demos",
  version: "0.1.26",
  license: "MIT",
  repository: "https://github.com/DavidJGrimsley/mrdj-dev-suite",
  sourcePath: "packages/cli",
};

interface ItemInput {
  id: string;
  name: string;
  description: string;
  kind: LibraryItemKind;
  source?: LibrarySource;
  tags?: readonly string[];
  categories?: readonly string[];
  compatibility?: LibraryCompatibility;
  dependencies?: readonly LibraryDependency[];
  composedItems?: readonly string[];
  relatedItems?: readonly string[];
  variants?: readonly LibraryVariant[];
  assets?: readonly LibraryAsset[];
  integration?: LibraryIntegration;
  preview?: LibraryPreview;
}

function defineItem(input: ItemInput): LibraryItem {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    kind: input.kind,
    source: input.source ?? MDS_SOURCE,
    tags: input.tags ?? [],
    categories: input.categories ?? [],
    delivery: "source-copy",
    compatibility: input.compatibility ?? SDK_56,
    dependencies: input.dependencies ?? [],
    composedItems: input.composedItems ?? [],
    relatedItems: input.relatedItems ?? [],
    variants: input.variants ?? [],
    assets: input.assets ?? [],
    integration:
      input.integration ??
      ({
        summary:
          "Copy the editable source into the detected project structure.",
        instructions: [],
      } satisfies LibraryIntegration),
    ...(input.preview ? { preview: input.preview } : {}),
  };
}

function asset(
  path: string,
  destination: string,
  role: LibraryAssetRole = "source",
  encoding: LibraryAsset["encoding"] = "utf8",
  contentTokens?: LibraryAsset["contentTokens"],
): LibraryAsset {
  return {
    path,
    destination,
    role,
    encoding,
    ...(contentTokens ? { contentTokens } : {}),
  };
}

function mdsAsset(
  relativePath: string,
  destination: string,
  role: LibraryAssetRole = "source",
  contentTokens?: LibraryAsset["contentTokens"],
): LibraryAsset {
  return asset(
    `assets/mds/${relativePath}`,
    destination,
    role,
    "utf8",
    contentTokens,
  );
}

function ceaAsset(
  relativePath: string,
  destination: string,
  role: LibraryAssetRole = "source",
  encoding: LibraryAsset["encoding"] = "utf8",
): LibraryAsset {
  return asset(
    `assets/create-expo-app/sdk-56/${relativePath}`,
    destination,
    role,
    encoding,
  );
}

function cesAsset(
  relativePath: string,
  destination: string,
  role: LibraryAssetRole = "source",
): LibraryAsset {
  return asset(
    `assets/create-expo-stack/2.21.3/${relativePath}`,
    destination,
    role,
  );
}

function nativeWindUiAsset(
  relativePath: string,
  destination: string,
): LibraryAsset {
  return asset(
    `assets/create-expo-stack/2.21.3-mrdj.2/${relativePath}`,
    destination,
    "source",
  );
}

function runtime(
  name: string,
  version: string,
  installer: LibraryDependency["installer"] = "package-manager",
): LibraryDependency {
  return { name, version, kind: "runtime", installer };
}

function development(name: string, version: string): LibraryDependency {
  return { name, version, kind: "development", installer: "package-manager" };
}

function routeVariants(
  sourcePath: string,
  routeName: string,
): LibraryVariant[] {
  const tabsRouteName = routeName === "index" ? "exposition" : routeName;
  return [
    {
      id: "stack",
      name: "Stack route",
      compatibility: {
        navigation: ["expo-router"],
        navigationLayout: ["stack"],
        aliases: ["@"],
      },
      dependencies: [runtime("expo-router", "~56.2.6", "expo")],
      assets: [
        mdsAsset(sourcePath, `{{appDir}}/exposition/${routeName}.tsx`, "route"),
      ],
    },
    {
      id: "tabs",
      name: "Tabs route",
      compatibility: {
        navigation: ["expo-router"],
        navigationLayout: ["tabs"],
        aliases: ["@"],
      },
      dependencies: [runtime("expo-router", "~56.2.6", "expo")],
      assets: [
        mdsAsset(sourcePath, `{{appDir}}/(tabs)/${tabsRouteName}.tsx`, "route"),
      ],
    },
    {
      id: "drawer-tabs",
      name: "Drawer and tabs route",
      compatibility: {
        navigation: ["expo-router"],
        navigationLayout: ["drawer+tabs"],
        aliases: ["@"],
      },
      dependencies: [runtime("expo-router", "~56.2.6", "expo")],
      assets: [
        mdsAsset(
          `routes/drawer-tabs/${routeName}.tsx`,
          `{{appDir}}/(drawer)/(tabs)/${routeName}.tsx`,
          "route",
        ),
      ],
    },
  ];
}

const mdsItems: LibraryItem[] = [
  defineItem({
    id: "mds/theme-support",
    name: "MDS theme support",
    description:
      "Typed theme tokens, runtime provider, and generated font asset map.",
    kind: "integration",
    tags: ["theme", "tokens"],
    categories: ["theming", "support"],
    assets: [
      mdsAsset("src/theme/tokens.ts", "src/theme/tokens.ts", "support"),
      mdsAsset("src/theme/provider.tsx", "src/theme/provider.tsx", "support"),
      mdsAsset("src/theme/color-utils.ts", "src/theme/color-utils.ts", "support"),
      mdsAsset(
        "src/theme/font-assets.ts",
        "src/theme/font-assets.ts",
        "support",
      ),
    ],
    integration: {
      summary: "Install the theme provider near the root of the React tree.",
      instructions: [
        "Wrap application routes in AppThemeProvider before using MDS themed screens.",
      ],
    },
  }),
  defineItem({
    id: "swmansion/animated-pressable",
    name: "Animated pressable",
    description:
      "A spring-free timing animation example for tactile press feedback.",
    kind: "animation",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["pressable", "reanimated", "eject:shared", "eject:exposition"],
    categories: ["motion", "controls"],
    dependencies: [runtime("react-native-reanimated", "4.3.1", "expo")],
    assets: [
      mdsAsset(
        "src/components/swmansion/animated-pressable.tsx",
        "{{componentsDir}}/swmansion/animated-pressable.tsx",
      ),
    ],
  }),
  defineItem({
    id: "swmansion/gesture-card",
    name: "Gesture card",
    description:
      "A draggable card demonstrating Gesture Handler and Reanimated composition.",
    kind: "animation",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["gesture", "reanimated", "eject:shared", "eject:exposition"],
    categories: ["motion", "gestures"],
    dependencies: [
      runtime("react-native-gesture-handler", "~2.31.1", "expo"),
      runtime("react-native-reanimated", "4.3.1", "expo"),
    ],
    assets: [
      mdsAsset(
        "src/components/swmansion/gesture-card.tsx",
        "{{componentsDir}}/swmansion/gesture-card.tsx",
      ),
    ],
  }),
  defineItem({
    id: "swmansion/keyboard-form",
    name: "Keyboard-aware form",
    description:
      "A keyboard-aware form with native toolbar behavior and safe platform fallback.",
    kind: "component",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["form", "keyboard", "eject:shared", "eject:exposition"],
    categories: ["forms", "input"],
    dependencies: [
      runtime("react-native-keyboard-controller", "1.21.6", "expo"),
    ],
    assets: [
      mdsAsset(
        "src/components/swmansion/keyboard-form.tsx",
        "{{componentsDir}}/swmansion/keyboard-form.tsx",
      ),
    ],
  }),
  defineItem({
    id: "swmansion/svg-mark",
    name: "SVG mark",
    description: "A compact reusable SVG mark with no project-specific state.",
    kind: "component",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["svg", "brand", "eject:shared", "eject:exposition"],
    categories: ["graphics"],
    dependencies: [runtime("react-native-svg", "15.15.4", "expo")],
    assets: [
      mdsAsset(
        "src/components/swmansion/svg-mark.tsx",
        "{{componentsDir}}/swmansion/svg-mark.tsx",
      ),
    ],
  }),
  defineItem({
    id: "swmansion/software-mansion-logo",
    name: "Software Mansion logo",
    description: "The SVG logo used by the generated package exposition.",
    kind: "component",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["svg", "logo", "eject:shared", "eject:exposition"],
    categories: ["graphics", "exposition"],
    dependencies: [runtime("react-native-svg", "15.15.4", "expo")],
    assets: [
      mdsAsset(
        "src/components/swmansion/software-mansion-logo.tsx",
        "{{componentsDir}}/swmansion/software-mansion-logo.tsx",
      ),
    ],
  }),
  defineItem({
    id: "swmansion/screens-card",
    name: "Screens status card",
    description: "A small React Native Screens capability and status example.",
    kind: "component",
    source: SOFTWARE_MANSION_DEMO_SOURCE,
    tags: ["navigation", "screens", "eject:shared", "eject:exposition"],
    categories: ["exposition", "navigation"],
    dependencies: [runtime("react-native-screens", "4.25.2", "expo")],
    assets: [
      mdsAsset(
        "src/components/swmansion/screens-card.tsx",
        "{{componentsDir}}/swmansion/screens-card.tsx",
      ),
    ],
  }),
  defineItem({
    id: "mds/package-card",
    name: "Package card",
    description:
      "A themed card for documenting an included package and its purpose.",
    kind: "component",
    tags: ["card", "package", "eject:shared", "eject:exposition"],
    categories: ["exposition", "content"],
    composedItems: ["mds/theme-support"],
    assets: [
      mdsAsset(
        "src/components/exposition/package-card.tsx",
        "{{componentsDir}}/exposition/package-card.tsx",
      ),
    ],
  }),
  defineItem({
    id: "mds/exposition-components",
    name: "Exposition component set",
    description:
      "The complete barrel-exported component set used by MDS exposition screens.",
    kind: "integration",
    tags: ["components", "eject:shared", "eject:exposition"],
    categories: ["exposition", "support"],
    composedItems: [
      "swmansion/animated-pressable",
      "swmansion/gesture-card",
      "swmansion/keyboard-form",
      "swmansion/svg-mark",
      "swmansion/software-mansion-logo",
      "swmansion/screens-card",
      "mds/package-card",
    ],
    assets: [
      mdsAsset(
        "src/components/exposition/notice.tsx",
        "{{componentsDir}}/exposition/notice.tsx",
        "support",
      ),
      mdsAsset(
        "src/components/exposition/index.ts",
        "{{componentsDir}}/exposition/index.ts",
        "support",
      ),
    ],
  }),
  defineItem({
    id: "mds/legal-documents",
    name: "Legal documents",
    description:
      "Reusable terms and privacy content with public routes, modal review, settings links, onboarding agreement, and material update gate surfaces.",
    kind: "flow",
    tags: [
      "legal",
      "terms",
      "privacy",
      "agreements",
      "content-pages",
      "onboarding",
      "legal-update-gate",
      "protected-routes",
    ],
    categories: ["legal", "content", "onboarding"],
    compatibility: { ...SDK_56, platforms: ALL_PLATFORMS },
    dependencies: [
      runtime("react-native-safe-area-context", "~5.7.0", "expo"),
    ],
    composedItems: ["mds/theme-support"],
    relatedItems: ["mds/onboarding", "mds/onboarding-state", "mds/settings"],
    variants: [
      {
        id: "public-routes",
        name: "Public terms and privacy routes",
        description:
          "Adds /terms and /privacy Expo Router routes backed by the shared legal document source.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset("src/app/terms.tsx", "{{appDir}}/terms.tsx", "route"),
          mdsAsset("src/app/privacy.tsx", "{{appDir}}/privacy.tsx", "route"),
        ],
        integration: [
          "Register /terms and /privacy as public routes if your app has auth or hosted-route guards.",
          "If the root Expo Router layout renders Tabs, NativeTabs, or a custom tab shell directly, move tabbed screens into a route group and render a root Stack or Slot so /terms and /privacy can render outside the tabs.",
        ],
      },
      {
        id: "viewer-only",
        name: "Reusable viewer only",
        description:
          "Copies the legal content source, renderer, modal viewer, and acceptance hook without adding routes.",
        integration: [
          "Import LegalDocumentView or LegalDocumentModal from the copied legal feature files where the app needs a custom legal surface.",
        ],
      },
      {
        id: "onboarding-agreement",
        name: "Onboarding agreement surface",
        description:
          "Adds a standalone onboarding legal-agreement route powered by the shared document viewer and local acceptance hook.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset(
            "src/features/legal/legal-agreement-screen.tsx",
            "{{featuresDir}}/legal/legal-agreement-screen.tsx",
          ),
          mdsAsset(
            "src/app/onboarding/legal-agreement.tsx",
            "{{appDir}}/onboarding/legal-agreement.tsx",
            "route",
          ),
        ],
        integration: [
          "Wire the legal agreement route into the app's onboarding flow before routing to auth, profile setup, or the main app.",
        ],
      },
      {
        id: "settings-links",
        name: "Settings or app-info links",
        description:
          "Adds reusable settings/app-info links plus public legal routes so users can open the documents from app chrome.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset(
            "src/features/legal/legal-document-links.tsx",
            "{{featuresDir}}/legal/legal-document-links.tsx",
          ),
          mdsAsset("src/app/terms.tsx", "{{appDir}}/terms.tsx", "route"),
          mdsAsset("src/app/privacy.tsx", "{{appDir}}/privacy.tsx", "route"),
        ],
        integration: [
          "Ask where the app should expose legal links, then render LegalDocumentLinks from the copied feature file in that settings or app-info surface.",
        ],
      },
      {
        id: "legal-update-gate",
        name: "Material update gate",
        description:
          "Adds /legal/updates for required legal re-acceptance before protected app content opens.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset("src/app/terms.tsx", "{{appDir}}/terms.tsx", "route"),
          mdsAsset("src/app/privacy.tsx", "{{appDir}}/privacy.tsx", "route"),
          mdsAsset(
            "src/app/legal/updates.tsx",
            "{{appDir}}/legal/updates.tsx",
            "route",
          ),
          mdsAsset(
            "src/features/legal/legal-update-screen.tsx",
            "{{featuresDir}}/legal/legal-update-screen.tsx",
          ),
        ],
        integration: [
          "Keep /terms, /privacy, and /legal/updates public, then wrap app routes in Stack.Protected or Tabs.Protected with a guard that includes legalGateStatus === \"complete\".",
          "Replace the default memory legal adapter with mds/onboarding-state before hosted production use. Supabase user acceptance rows are the production path.",
          "Mark only material legal updates with requiresReacceptance: true; minor copy edits can update public documents without blocking app entry.",
        ],
      },
    ],
    assets: [
      mdsAsset(
        "src/features/legal/legal-documents.ts",
        "{{featuresDir}}/legal/legal-documents.ts",
        "support",
        [
          "__MDS_APP_NAME__",
          "__MDS_LEGAL_BUSINESS_NAME__",
          "__MDS_LEGAL_CONTACT_EMAIL__",
          "__MDS_LEGAL_ADDRESS_OR_REGION_NOTE__",
        ],
      ),
      mdsAsset(
        "src/features/legal/legal-document-view.tsx",
        "{{featuresDir}}/legal/legal-document-view.tsx",
      ),
      mdsAsset(
        "src/features/legal/legal-page-route.tsx",
        "{{featuresDir}}/legal/legal-page-route.tsx",
      ),
      mdsAsset(
        "src/features/legal/legal-document-modal.tsx",
        "{{featuresDir}}/legal/legal-document-modal.tsx",
      ),
      mdsAsset(
        "src/features/legal/use-legal-acceptance.ts",
        "{{featuresDir}}/legal/use-legal-acceptance.ts",
        "support",
      ),
      mdsAsset(
        "src/features/legal/legal-acceptance-config.ts",
        "{{featuresDir}}/legal/legal-acceptance-config.ts",
        "support",
      ),
      mdsAsset(
        "src/features/legal/legal-acceptance-adapter.ts",
        "{{featuresDir}}/legal/legal-acceptance-adapter.ts",
        "support",
      ),
    ],
    integration: {
      summary:
        "Copy the shared legal content source and render it through routes, modal review, settings links, or onboarding agreement surfaces.",
      instructions: [
        "Replace every placeholder legal section with documents reviewed for the app, jurisdiction, data practices, and business model.",
        "Keep the terms and privacy content in the shared legal-documents source so public routes, modals, settings links, and onboarding review show the same copy.",
        "Use the legal-update-gate variant when an authenticated app must block protected routes until current material document versions are accepted.",
        "If the app already has brand or theme colors, map the copied src/theme/tokens.ts palette to the app's existing light and dark colors, or pass color overrides into AppThemeProvider.",
      ],
      notes: [
        "The bundled placeholder copy is not legal advice and must be reviewed before production.",
        "The default legal adapter is memory-only and is not a hosted audit record.",
        "Use mds/onboarding-state or mds/onboarding-auth-supabase to persist completion and versioned legal acceptance.",
        "Hosted apps should configure user-scoped Supabase persistence and write legal acceptance after sign-in.",
        "AppThemeProvider follows the system color scheme by default; pass scheme=\"light\", scheme=\"dark\", or scheme=\"preview\" when a screen needs a fixed theme.",
      ],
    },
    preview: {
      description:
        "Terms and privacy documents that can render as public routes, modals, settings links, or onboarding review.",
    },
  }),
  defineItem({
    id: "mds/auth",
    name: "Auth flow",
    description:
      "Provider-neutral authentication routes, refreshable session adapters, a reusable guard, and backend-specific variants.",
    kind: "flow",
    tags: [
      "auth",
      "session",
      "sign-in",
      "sign-up",
      "protected-routes",
      "eject:auth",
    ],
    categories: ["auth", "flows", "onboarding"],
    compatibility: SDK_56_ROUTER,
    dependencies: [runtime("expo-router", "~56.2.6", "expo")],
    composedItems: ["mds/theme-support"],
    relatedItems: ["mds/onboarding", "mds/onboarding-state", "mds/legal-documents", "mds/settings"],
    variants: [
      {
        id: "base",
        name: "Base auth adapter",
        description:
          "Adds a provider-neutral auth shell with an in-memory adapter for custom provider work.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        assets: [
          mdsAsset(
            "src/features/auth/adapters/base-auth-adapter.tsx",
            "{{featuresDir}}/auth/auth-adapter.tsx",
            "support",
          ),
          mdsAsset("project/auth-base.md", "project/auth.md", "support"),
        ],
        integration: [
          "Replace the base auth adapter with a real provider before production.",
          "Wrap the app's root route layout in AuthProvider before using useAuth or protected auth screens.",
        ],
      },
      {
        id: "with-supabase",
        name: "With Supabase",
        description:
          "Wires the auth shell to Supabase Auth and emits onboarding/legal persistence SQL.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [
          runtime("@supabase/supabase-js", "^2.112.3"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
        ],
        assets: [
          mdsAsset(
            "src/features/auth/adapters/supabase-auth-adapter.tsx",
            "{{featuresDir}}/auth/auth-adapter.tsx",
            "support",
          ),
          mdsAsset(
            "src/services/supabase.ts",
            "src/services/supabase.ts",
            "support",
          ),
          mdsAsset(
            "supabase/migrations/0001_mds_auth_onboarding.sql",
            "supabase/migrations/0001_mds_auth_onboarding.sql",
            "support",
          ),
          mdsAsset("env/supabase.env.example", ".env.example", "support"),
          mdsAsset("project/auth-supabase.md", "project/auth.md", "support"),
        ],
        integration: [
          "Generated apps ship a blank .env.example template and a local .env.local with Supabase publishable credentials.",
          "Apply the generated Supabase migration before relying on onboarding or legal acceptance persistence.",
          "Keep Supabase service-role and secret keys out of Expo client code; use RLS policies for client-visible data.",
        ],
      },
      {
        id: "with-firebase",
        name: "With Firebase",
        description:
          "Wires the auth shell to Firebase Authentication through the Expo-compatible Firebase JS SDK.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [
          runtime("firebase", "^12.17.1", "expo"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
        ],
        assets: [
          mdsAsset(
            "src/features/auth/adapters/firebase-auth-adapter.tsx",
            "{{featuresDir}}/auth/auth-adapter.tsx",
            "support",
          ),
          mdsAsset("src/services/firebase.ts", "src/services/firebase.ts", "support"),
          mdsAsset("env/firebase.env.example", ".env.example", "support"),
          mdsAsset("project/auth-firebase.md", "project/auth.md", "support"),
        ],
        integration: [
          "Register a Firebase web app, enable Email/Password auth, and set the EXPO_PUBLIC_FIREBASE_* variables.",
          "Use Firebase JS SDK for this source-copy variant; React Native Firebase requires a development build and native config plugins.",
          "Add Firestore or another backend-backed audit path before treating legal acceptance as production-persistent.",
        ],
      },
      {
        id: "with-convex",
        name: "With Convex",
        description:
          "Wires the auth shell to Convex React Native and Convex Auth. Experimental.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [
          runtime("convex", "^1.43.0"),
          runtime("@convex-dev/auth", "^0.0.95"),
          runtime("@auth/core", "0.41.1"),
          runtime("expo-secure-store", "~56.0.4", "expo"),
        ],
        assets: [
          mdsAsset(
            "src/features/auth/adapters/convex-auth-adapter.tsx",
            "{{featuresDir}}/auth/auth-adapter.tsx",
            "support",
          ),
          mdsAsset("src/services/convex.ts", "src/services/convex.ts", "support"),
          mdsAsset("env/convex.env.example", ".env.example", "support"),
          mdsAsset("project/auth-convex.md", "project/auth.md", "support"),
        ],
        integration: [
          "Run npx convex dev and npx @convex-dev/auth before using the generated Convex auth adapter.",
          "Set EXPO_PUBLIC_CONVEX_URL for the Expo app.",
          "Treat this variant as experimental until the generated app is dogfooded with current Convex Auth APIs.",
        ],
      },
    ],
    assets: [
      mdsAsset(
        "src/features/auth/auth-types.ts",
        "{{featuresDir}}/auth/auth-types.ts",
        "support",
      ),
      mdsAsset(
        "src/features/auth/auth-provider.tsx",
        "{{featuresDir}}/auth/auth-provider.tsx",
        "support",
      ),
      mdsAsset(
        "src/features/auth/auth-guard.tsx",
        "{{featuresDir}}/auth/auth-guard.tsx",
        "support",
      ),
      mdsAsset(
        "src/features/auth/auth-guard-logic.ts",
        "{{featuresDir}}/auth/auth-guard-logic.ts",
        "support",
      ),
      mdsAsset(
        "src/features/auth/auth-screen.tsx",
        "{{featuresDir}}/auth/auth-screen.tsx",
      ),
      mdsAsset(
        "src/app/(auth)/sign-in.tsx",
        "{{appDir}}/(auth)/sign-in.tsx",
        "route",
      ),
      mdsAsset(
        "src/app/(auth)/sign-up.tsx",
        "{{appDir}}/(auth)/sign-up.tsx",
        "route",
      ),
      mdsAsset(
        "src/app/(auth)/reset-password.tsx",
        "{{appDir}}/(auth)/reset-password.tsx",
        "route",
      ),
    ],
    integration: {
      summary:
        "Add editable auth routes and a provider-backed AuthProvider to an Expo Router app.",
      instructions: [
        "Keep /sign-in, /sign-up, and /reset-password public, then protect app routes from the root Expo Router layout.",
        "Choose exactly one auth provider variant so auth-adapter.tsx has a single implementation.",
        "Compose with mds/onboarding by setting onboarding completion to /sign-in when users should authenticate after onboarding.",
        "Use AuthGuard for screen-level protection when a copied screen should refresh auth on focus or redirect independently from the root Stack.Protected shell.",
      ],
      notes: [
        "Protected routes are a client-side navigation guard; provider backends and database policies still enforce data access.",
        "The Firebase variant intentionally uses Firebase JS SDK, not React Native Firebase, so it stays Expo-compatible.",
        "The Convex variant is experimental because Convex Auth is beta and requires a Convex initialization step.",
      ],
    },
    preview: {
      description:
        "Sign-in, sign-up, password reset, auth provider, and provider-specific adapters.",
    },
  }),
  defineItem({
    id: "mds/onboarding",
    name: "Onboarding flow",
    description:
      "A reusable multi-screen onboarding flow with editable completion behavior and optional legal-document review.",
    kind: "flow",
    tags: ["onboarding", "multi-screen", "without-auth", "eject:onboarding"],
    categories: ["onboarding", "flows"],
    compatibility: SDK_56_ROUTER,
    composedItems: ["mds/theme-support", "mds/onboarding-state"],
    relatedItems: ["mds/legal-documents", "mds/onboarding-state", "mds/settings"],
    variants: [
      {
        id: "multi-screen",
        name: "Multi-screen onboarding",
        description:
          "Adds welcome, feature highlights, and completion screens as Expo Router routes.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset(
            "src/features/onboarding/onboarding-config.ts",
            "{{featuresDir}}/onboarding/onboarding-config.ts",
            "support",
            ["__MDS_APP_NAME__"],
          ),
          mdsAsset(
            "src/features/onboarding/complete-screen.tsx",
            "{{featuresDir}}/onboarding/complete-screen.tsx",
          ),
          mdsAsset("src/app/onboarding.tsx", "{{appDir}}/onboarding.tsx", "route"),
          mdsAsset(
            "src/app/onboarding/features.tsx",
            "{{appDir}}/onboarding/features.tsx",
            "route",
          ),
          mdsAsset(
            "src/app/onboarding/complete.tsx",
            "{{appDir}}/onboarding/complete.tsx",
            "route",
          ),
        ],
        integration: [
          "Edit onboarding-config.ts to change copy, feature highlights, completion label, completion mode, and final route.",
          "Completion calls the copied onboarding-state adapter. Replace the memory adapter before hosted production use.",
        ],
      },
      {
        id: "multi-screen-with-legal",
        name: "Multi-screen onboarding with legal review",
        description:
          "Adds welcome, feature highlights, and a final legal review step powered by mds/legal-documents.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        composedItems: ["mds/legal-documents", "mds/onboarding-state"],
        assets: [
          mdsAsset(
            "src/features/onboarding/onboarding-config-with-legal.ts",
            "{{featuresDir}}/onboarding/onboarding-config.ts",
            "support",
            ["__MDS_APP_NAME__"],
          ),
          mdsAsset(
            "src/features/onboarding/legal-review-screen.tsx",
            "{{featuresDir}}/onboarding/legal-review-screen.tsx",
          ),
          mdsAsset("src/app/onboarding.tsx", "{{appDir}}/onboarding.tsx", "route"),
          mdsAsset(
            "src/app/onboarding/features.tsx",
            "{{appDir}}/onboarding/features.tsx",
            "route",
          ),
          mdsAsset(
            "src/app/onboarding/legal.tsx",
            "{{appDir}}/onboarding/legal.tsx",
            "route",
          ),
        ],
        integration: [
          "Replace the placeholder legal content in mds/legal-documents before production release.",
          "The onboarding legal screen imports the shared legal document modal and acceptance hook instead of duplicating legal copy.",
          "Edit onboarding-config.ts to change the feature highlights, legal step copy, completion label, completion mode, and final route.",
        ],
      },
    ],
    assets: [
      mdsAsset(
        "src/features/onboarding/welcome-screen.tsx",
        "{{featuresDir}}/onboarding/welcome-screen.tsx",
      ),
      mdsAsset(
        "src/features/onboarding/features-screen.tsx",
        "{{featuresDir}}/onboarding/features-screen.tsx",
      ),
    ],
    integration: {
      summary: "Add production onboarding routes to an Expo Router stack.",
      instructions: [
        "Start users at /onboarding, then replace or extend the copied screens as the product flow matures.",
        "Use mds/onboarding-state to choose memory, Zustand-local, or Supabase persistence without changing the screens.",
      ],
      notes: [
        "Onboarding UI does not import Zustand or Supabase directly.",
        "The default composed persistence adapter is memory-only and is not a hosted legal audit record.",
        "Preference/profile intake is intentionally omitted until the app can store the responses or change behavior from them.",
        "Use a with-legal variant when onboarding needs legal review from mds/legal-documents.",
      ],
    },
    preview: {
      description:
        "Welcome, feature highlights, optional legal review, and editable completion handoff.",
    },
  }),
  defineItem({
    id: "mds/onboarding-state",
    name: "Onboarding persistence adapters",
    description:
      "Completion and legal-acceptance adapters for memory, Zustand-local, Supabase, or Zustand cache plus Supabase sync.",
    kind: "integration",
    tags: ["onboarding", "persistence", "adapter", "legal"],
    categories: ["onboarding", "support"],
    compatibility: SDK_56_ALIAS,
    relatedItems: ["mds/onboarding", "mds/legal-documents", "mds/auth"],
    variants: [
      {
        id: "memory",
        name: "Memory adapter",
        description:
          "In-process completion and legal acceptance. Useful for clean apps and demos, not hosted legal records.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        assets: [
          mdsAsset(
            "src/features/onboarding-state/adapters/memory-onboarding-state-adapter.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-adapter.ts",
            "support",
          ),
        ],
      },
      {
        id: "zustand-local",
        name: "Zustand local adapter",
        description:
          "Persists onboarding completion and legal acceptance on-device with Zustand. Not a hosted audit trail.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [
          runtime("zustand", "^5.0.8"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
        ],
        assets: [
          mdsAsset(
            "src/features/onboarding-state/onboarding-store.ts",
            "{{featuresDir}}/onboarding-state/onboarding-store.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/onboarding-state-zustand.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-zustand.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/adapters/zustand-onboarding-state-adapter.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-adapter.ts",
            "support",
          ),
        ],
      },
      {
        id: "supabase",
        name: "Supabase adapter",
        description:
          "Uses user_onboarding_state and user_legal_acceptances as the source of truth after sign-in.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("@supabase/supabase-js", "^2.112.3")],
        assets: [
          mdsAsset(
            "src/features/onboarding-state/onboarding-state-supabase.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-supabase.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/adapters/supabase-onboarding-state-adapter.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-adapter.ts",
            "support",
          ),
        ],
        integration: [
          "Apply supabase/migrations/0001_mds_auth_onboarding.sql before relying on remote persistence.",
          "Legal writes require a signed-in user id. Pre-auth local acceptance is not a hosted record.",
        ],
      },
      {
        id: "zustand-supabase",
        name: "Zustand cache plus Supabase",
        description:
          "Zustand is the local cache and pending queue. Supabase remains the canonical store.",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [
          runtime("zustand", "^5.0.8"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
          runtime("@supabase/supabase-js", "^2.112.3"),
        ],
        assets: [
          mdsAsset(
            "src/features/onboarding-state/onboarding-store.ts",
            "{{featuresDir}}/onboarding-state/onboarding-store.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/onboarding-state-supabase.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-supabase.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/onboarding-state-zustand-supabase.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-zustand-supabase.ts",
            "support",
          ),
          mdsAsset(
            "src/features/onboarding-state/adapters/zustand-supabase-onboarding-state-adapter.ts",
            "{{featuresDir}}/onboarding-state/onboarding-state-adapter.ts",
            "support",
          ),
        ],
        integration: [
          "Apply supabase/migrations/0001_mds_auth_onboarding.sql before relying on remote persistence.",
          "Zustand must not be treated as the legal source of truth when this variant is selected.",
        ],
      },
    ],
    assets: [
      mdsAsset(
        "src/features/onboarding-state/onboarding-state-types.ts",
        "{{featuresDir}}/onboarding-state/onboarding-state-types.ts",
        "support",
      ),
      mdsAsset(
        "src/features/onboarding-state/onboarding-state-core.ts",
        "{{featuresDir}}/onboarding-state/onboarding-state-core.ts",
        "support",
      ),
      mdsAsset(
        "src/features/onboarding-state/onboarding-state-memory.ts",
        "{{featuresDir}}/onboarding-state/onboarding-state-memory.ts",
        "support",
      ),
      mdsAsset(
        "src/features/onboarding-state/onboarding-state.ts",
        "{{featuresDir}}/onboarding-state/onboarding-state.ts",
        "support",
      ),
      mdsAsset(
        "src/features/legal/legal-acceptance-config.ts",
        "{{featuresDir}}/legal/legal-acceptance-config.ts",
        "support",
      ),
    ],
    integration: {
      summary:
        "Copy adapter contracts and one persistence implementation for onboarding completion and legal acceptance.",
      instructions: [
        "Choose exactly one variant so onboarding-state-adapter.ts has a single implementation.",
        "Import the copied onboarding-state module from screens and legal hooks instead of Zustand or Supabase.",
        "Memory and Zustand-local are not hosted legal audit records.",
      ],
      notes: [
        "Supabase variants write user-scoped, version-aware legal rows and do not update or delete those rows from the client.",
        "Zustand is canonical only for the zustand-local variant. With Supabase it is cache-only.",
      ],
    },
  }),
  defineItem({
    id: "mds/onboarding-auth-supabase",
    name: "Onboarding plus Supabase auth composition",
    description:
      "Wires onboarding, Supabase auth, and user-scoped onboarding persistence.",
    kind: "integration",
    tags: ["onboarding", "auth", "supabase", "persistence", "with-auth"],
    categories: ["onboarding", "auth", "flows"],
    compatibility: SDK_56_ROUTER,
    composedItems: [
      "mds/onboarding",
      "mds/auth",
      "mds/onboarding-state",
    ],
    relatedItems: ["mds/settings"],
    assets: [
      mdsAsset(
        "src/features/onboarding/onboarding-persistence-sync.tsx",
        "{{featuresDir}}/onboarding/onboarding-persistence-sync.tsx",
        "support",
      ),
    ],
    integration: {
      summary:
        "Compose onboarding and Supabase auth, then replace the default memory persistence adapter with a Supabase-backed adapter.",
      instructions: [
        "Install mds/onboarding-state --variant supabase or zustand-supabase so hosted legal acceptance is user-scoped.",
        "Keep /sign-in and /sign-up public; include legal routes only when mds/legal-documents is selected separately or through legal onboarding.",
        "If legal onboarding is selected, prefer intro, features, auth, then legal so legal rows are written with a known user id.",
        "Apply supabase/migrations/0001_mds_auth_onboarding.sql; generated apps include .env.local with Supabase publishable credentials plus a blank tracked .env.example template.",
      ],
      notes: [
        "This composition does not add mds/db and does not install Firebase or Convex persistence.",
        "Zustand remains a cache when both Zustand and Supabase are selected.",
      ],
    },
  }),
  defineItem({
    id: "mds/db",
    name: "Database adapter contract",
    description:
      "Provider-neutral database adapter contract with Supabase implementation and Firebase skeleton.",
    kind: "integration",
    tags: ["database", "data", "adapter", "supabase", "firebase", "eject:data"],
    categories: ["data", "support"],
    compatibility: SDK_56_ALIAS,
    relatedItems: ["mds/auth", "mds/data-local", "mds/onboarding-state"],
    variants: [
      {
        id: "supabase",
        name: "Supabase adapter",
        description:
          "Copies the provider-neutral contract, typed app schema, Supabase adapter, and Supabase-only factory.",
        dependencies: [
          runtime("@supabase/supabase-js", "^2.112.3"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
        ],
        assets: [
          mdsAsset("src/db/supabase.ts", "src/db/supabase.ts", "support"),
          mdsAsset("src/db/index.supabase.ts", "src/db/index.ts", "support"),
          mdsAsset("src/services/supabase.ts", "src/services/supabase.ts", "support"),
          mdsAsset("env/supabase.env.example", ".env.example", "support"),
        ],
        integration: [
          "Use getAdapter() from src/db/index.ts instead of importing Supabase directly from screens or feature logic.",
          "Keep Supabase service-role and secret keys out of Expo client code.",
          "Use Postgres functions or server routes for atomic multi-step writes; the generated client transaction method is a callback boundary only.",
        ],
      },
      {
        id: "firebase",
        name: "Firebase skeleton",
        description:
          "Copies the provider-neutral contract, typed app schema, Firebase skeleton adapter, and Firebase-only factory.",
        dependencies: [
          runtime("firebase", "^12.17.1"),
          runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
        ],
        assets: [
          mdsAsset("src/db/firebase.ts", "src/db/firebase.ts", "support"),
          mdsAsset("src/db/index.firebase.ts", "src/db/index.ts", "support"),
          mdsAsset("src/services/firebase.ts", "src/services/firebase.ts", "support"),
          mdsAsset("env/firebase.env.example", ".env.example", "support"),
        ],
        integration: [
          "Treat the Firebase adapter as a skeleton until Firestore collection paths, auth rules, and query mapping are defined.",
          "Wire Firestore onSnapshot for subscriptions after the app schema is finalized.",
          "Use Firebase JS SDK for this source-copy variant; React Native Firebase requires a development build and native config plugins.",
        ],
      },
    ],
    assets: [
      mdsAsset("src/db/adapter.ts", "src/db/adapter.ts", "support"),
      mdsAsset("src/types/database.ts", "src/types/database.ts", "support"),
    ],
    integration: {
      summary:
        "Copy the stable database adapter contract and one provider implementation into generated apps.",
      instructions: [
        "Keep product code typed against DatabaseAdapter and the app-specific AppDatabase schema.",
        "Choose exactly one provider variant so src/db/index.ts imports only the selected backend.",
        "Extend src/types/database.ts with the app's real table or collection rows before building product data flows.",
      ],
      notes: [
        "This is a narrow data boundary, not an ORM, migration system, or query builder.",
        "The Supabase adapter supports reads, writes, realtime subscriptions, and contract-level error mapping.",
        "The Firebase variant is intentionally a skeleton because Firestore document paths are app-specific.",
      ],
    },
  }),
  defineItem({
    id: "mds/settings",
    name: "Settings screen",
    description:
      "A reusable settings surface with account summary, sign-out, legal links, and app version details.",
    kind: "screen",
    tags: ["settings", "form", "eject:settings"],
    categories: ["settings", "screens"],
    compatibility: { ...SDK_56, platforms: ALL_PLATFORMS },
    variants: [
      {
        id: "expo-router",
        name: "Expo Router route",
        compatibility: { navigation: ["expo-router"], aliases: ["@"] },
        dependencies: [runtime("expo-router", "~56.2.6", "expo")],
        assets: [
          mdsAsset("src/app/settings.tsx", "{{appDir}}/settings.tsx", "route"),
        ],
      },
      {
        id: "react-navigation",
        name: "React Navigation screen",
        compatibility: { navigation: ["react-navigation"] },
        integration: [
          "Register SettingsScreen in the application-owned React Navigation tree.",
        ],
      },
    ],
    composedItems: ["mds/theme-support"],
    relatedItems: ["mds/onboarding", "mds/legal-documents", "mds/auth"],
    assets: [
      mdsAsset(
        "src/features/auth/auth-types.ts",
        "{{featuresDir}}/auth/auth-types.ts",
        "support",
      ),
      mdsAsset(
        "src/features/settings/settings-screen.tsx",
        "{{featuresDir}}/settings/settings-screen.tsx",
      ),
      mdsAsset(
        "src/features/settings/settings-screen-logic.ts",
        "{{featuresDir}}/settings/settings-screen-logic.ts",
        "support",
      ),
    ],
    integration: {
      summary:
        "Register the settings route as a modal in the root Expo Router stack and pass a real auth adapter when the app has authentication.",
      instructions: [
        "Add a settings route link from an application-owned screen or menu.",
        "Pass local /terms and /privacy routes when legal documents are installed, and optionally pass an external GDPR URL when compliance copy lives off-app.",
        "Use the placeholder route wrapper only as a starter; generated apps with auth should wire SettingsScreen to the active adapter.",
      ],
    },
  }),
  defineItem({
    id: "mds/stylist-sync-support",
    name: "Stylist sync support",
    description:
      "The local Android sync helper used by the generated Stylist API route.",
    kind: "integration",
    tags: ["stylist", "sync", "developer-tools", "eject:stylist"],
    categories: ["theming", "developer-tools", "support"],
    compatibility: { ...SDK_56, platforms: ALL_PLATFORMS },
    dependencies: [development("@mr.dj2u/cli", "^0.1.26")],
    assets: [
      mdsAsset(
        "scripts/stylist-sync-android.mjs",
        "scripts/stylist-sync-android.mjs",
        "support",
      ),
    ],
    integration: {
      summary:
        "Keep the Stylist sync helper local to the project and install the matching MDS CLI development dependency.",
      instructions: [
        "Do not expose the Stylist sync endpoint in a production deployment.",
      ],
    },
  }),
  defineItem({
    id: "mds/stylist",
    name: "Stylist flow",
    description:
      "The generated local theme editor, embedded-font list, and protected sync API route.",
    kind: "flow",
    tags: ["stylist", "theme", "eject:stylist"],
    categories: ["theming", "developer-tools"],
    compatibility: SDK_56_ROUTER,
    dependencies: [
      runtime("@react-native-async-storage/async-storage", "2.2.0", "expo"),
      runtime("react-native-safe-area-context", "~5.7.0", "expo"),
      runtime("reanimated-color-picker", "^4.2.0"),
      development("tailwindcss", "^4.2.4"),
      development("@types/node", "^25.9.1"),
    ],
    composedItems: [
      "swmansion/animated-pressable",
      "mds/theme-support",
      "mds/stylist-sync-support",
    ],
    variants: routeVariants("src/app/exposition/stylist.tsx", "stylist"),
    assets: [
      mdsAsset(
        "src/features/exposition/stylist-screen.tsx",
        "{{featuresDir}}/exposition/stylist-screen.tsx",
        "source",
        ["__MDS_APP_NAME__"],
      ),
      mdsAsset(
        "src/features/exposition/embedded-fonts.ts",
        "{{featuresDir}}/exposition/embedded-fonts.ts",
        "support",
      ),
      mdsAsset(
        "src/app/exposition/stylist-sync+api.ts",
        "{{appDir}}/exposition/stylist-sync+api.ts",
        "route",
      ),
    ],
    integration: {
      summary:
        "Expose the Stylist route only in local development and keep the sync endpoint local.",
      instructions: [
        "Run Stylist through the MDS development command so its file sync endpoint targets the correct project.",
        "Eject or remove the developer-only route before a production release.",
      ],
    },
  }),
  defineItem({
    id: "mds/data-local",
    name: "Local data example",
    description:
      "A platform-aware local data boundary backed by Expo SQLite on native.",
    kind: "flow",
    tags: ["data", "sqlite", "adapter", "eject:data"],
    categories: ["data", "exposition"],
    compatibility: { ...SDK_56, platforms: ALL_PLATFORMS },
    dependencies: [runtime("expo-sqlite", "~56.0.4", "expo")],
    composedItems: ["mds/exposition-components", "mds/theme-support"],
    variants: routeVariants("src/app/exposition/data.tsx", "data"),
    assets: [
      mdsAsset(
        "src/features/exposition/data-screen.tsx",
        "{{featuresDir}}/exposition/data-screen.tsx",
      ),
      mdsAsset("src/data/mock-app.ts", "src/data/mock-app.ts", "support"),
      mdsAsset(
        "src/services/local-data.ts",
        "src/services/local-data.ts",
        "support",
      ),
      mdsAsset(
        "src/services/local-data.native.ts",
        "src/services/local-data.native.ts",
        "support",
      ),
    ],
    integration: {
      summary:
        "Use the service boundary from screens instead of importing SQLite directly.",
      instructions: [
        "Replace the fixture app snapshot before treating this example as product data.",
      ],
    },
  }),
  defineItem({
    id: "mds/expo-sdk-56",
    name: "Expo SDK 56 exposition",
    description:
      "A generated screen demonstrating Expo UI universal controls and SDK 56 capabilities.",
    kind: "screen",
    tags: ["expo", "sdk-56", "expo-ui", "eject:exposition"],
    categories: ["exposition", "sdk"],
    compatibility: { ...SDK_56, platforms: ALL_PLATFORMS },
    dependencies: [
      runtime("@expo/ui", "~56.0.14", "expo"),
      runtime("react-native-svg", "15.15.4", "expo"),
    ],
    composedItems: ["mds/exposition-components", "mds/theme-support"],
    variants: routeVariants("src/app/exposition/sdk-56.tsx", "sdk-56"),
    assets: [
      mdsAsset(
        "src/features/exposition/expo-sdk-56-screen.tsx",
        "{{featuresDir}}/exposition/expo-sdk-56-screen.tsx",
      ),
    ],
  }),
  defineItem({
    id: "mds/exposition",
    name: "MDS package exposition",
    description:
      "The complete temporary MDS package exposition, Stylist, local data, and SDK examples.",
    kind: "flow",
    tags: ["exposition", "packages", "eject:exposition"],
    categories: ["developer-tools", "flows"],
    compatibility: SDK_56_ROUTER,
    dependencies: [runtime("expo-router", "~56.2.6", "expo")],
    composedItems: [
      "mds/exposition-components",
      "mds/stylist",
      "mds/data-local",
      "mds/expo-sdk-56",
    ],
    relatedItems: ["nativewindui/components"],
    variants: routeVariants("src/app/exposition/index.tsx", "index"),
    assets: [
      mdsAsset(
        "src/features/exposition/exposition-screen.tsx",
        "{{featuresDir}}/exposition/exposition-screen.tsx",
      ),
    ],
    integration: {
      summary:
        "Install as a temporary learning surface and eject it before production.",
      instructions: [
        "Add links from a development-only home screen.",
        "Run `mds eject exposition` after deciding which examples to retain.",
      ],
    },
  }),
];

const nativeWindUiItems: LibraryItem[] = [
  defineItem({
    id: "nativewindui/support",
    name: "NativeWindUI support",
    description:
      "Class merging, color-scheme, navigation theme, color, and opacity helpers.",
    kind: "integration",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "support"],
    categories: ["styling", "support"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [
      runtime("clsx", "^2.1.0"),
      runtime("tailwind-merge", "^2.2.1"),
      runtime("nativewind", "latest"),
      runtime("expo-router", "~56.2.6", "expo"),
      runtime("react-native-screens", "4.25.2", "expo"),
    ],
    assets: [
      nativeWindUiAsset("src/lib/cn.ts", "src/lib/cn.ts"),
      nativeWindUiAsset(
        "src/lib/useColorScheme.tsx",
        "src/lib/useColorScheme.tsx",
      ),
      nativeWindUiAsset(
        "src/lib/useHeaderSearchBar.tsx",
        "src/lib/useHeaderSearchBar.tsx",
      ),
      nativeWindUiAsset("src/theme/colors.ts", "src/theme/colors.ts"),
      nativeWindUiAsset(
        "src/theme/with-opacity.ts",
        "src/theme/with-opacity.ts",
      ),
      nativeWindUiAsset("src/theme/index.ts", "src/theme/index.ts"),
    ],
  }),
  defineItem({
    id: "nativewindui/activity-indicator",
    name: "NativeWindUI activity indicator",
    description: "A theme-aware activity indicator.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "loading"],
    categories: ["feedback"],
    compatibility: SDK_56_NATIVEWIND_UI,
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/ActivityIndicator.tsx",
        "{{componentsDir}}/nativewindui/ActivityIndicator.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/avatar",
    name: "NativeWindUI avatar",
    description:
      "Avatar image and fallback primitives with NativeWind class composition.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "avatar"],
    categories: ["identity"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [runtime("@rn-primitives/avatar", "^1.4.0")],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Avatar.tsx",
        "{{componentsDir}}/nativewindui/Avatar.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/text",
    name: "NativeWindUI text",
    description: "Variant-driven cross-platform text backed by UITextView.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "text", "typography"],
    categories: ["typography"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [
      runtime("class-variance-authority", "^0.7.0"),
      runtime("react-native-uitextview", "^1.1.4", "expo"),
    ],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Text.tsx",
        "{{componentsDir}}/nativewindui/Text.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/button",
    name: "NativeWindUI button",
    description:
      "A CVA-powered pressable with primary, secondary, destructive, and plain variants.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "button", "variants"],
    categories: ["controls"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [
      runtime("@rn-primitives/slot", "^1.4.0"),
      runtime("class-variance-authority", "^0.7.0"),
    ],
    composedItems: ["nativewindui/support", "nativewindui/text"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Button.tsx",
        "{{componentsDir}}/nativewindui/Button.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/icon",
    name: "NativeWindUI icon",
    description: "Platform-specific SF Symbols and Material icon adapter.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "icon"],
    categories: ["graphics", "controls"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [
      runtime("@expo/vector-icons", "^15.0.2", "expo"),
      runtime("expo-symbols", "~56.0.5", "expo"),
      runtime("rn-icon-mapper", "^0.0.1"),
    ],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Icon/Icon.tsx",
        "{{componentsDir}}/nativewindui/Icon/Icon.tsx",
      ),
      nativeWindUiAsset(
        "src/components/nativewindui/Icon/Icon.ios.tsx",
        "{{componentsDir}}/nativewindui/Icon/Icon.ios.tsx",
      ),
      nativeWindUiAsset(
        "src/components/nativewindui/Icon/index.ts",
        "{{componentsDir}}/nativewindui/Icon/index.ts",
      ),
      nativeWindUiAsset(
        "src/components/nativewindui/Icon/types.ts",
        "{{componentsDir}}/nativewindui/Icon/types.ts",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/date-picker",
    name: "NativeWindUI date picker",
    description:
      "Platform-aware date picker with an Android trigger implementation.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "date", "picker"],
    categories: ["forms", "input"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [
      runtime("@react-native-community/datetimepicker", "9.1.0", "expo"),
    ],
    composedItems: [
      "nativewindui/support",
      "nativewindui/button",
      "nativewindui/text",
    ],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/DatePicker/DatePicker.tsx",
        "{{componentsDir}}/nativewindui/DatePicker/DatePicker.tsx",
      ),
      nativeWindUiAsset(
        "src/components/nativewindui/DatePicker/DatePicker.android.tsx",
        "{{componentsDir}}/nativewindui/DatePicker/DatePicker.android.tsx",
      ),
      nativeWindUiAsset(
        "src/components/nativewindui/DatePicker/index.ts",
        "{{componentsDir}}/nativewindui/DatePicker/index.ts",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/picker",
    name: "NativeWindUI picker",
    description: "A theme-aware native picker wrapper.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "picker"],
    categories: ["forms", "input"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [runtime("@react-native-picker/picker", "2.11.4", "expo")],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Picker.tsx",
        "{{componentsDir}}/nativewindui/Picker.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/progress-indicator",
    name: "NativeWindUI progress indicator",
    description: "An animated horizontal progress indicator.",
    kind: "animation",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "progress", "reanimated"],
    categories: ["feedback", "motion"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [runtime("react-native-reanimated", "4.3.1", "expo")],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/ProgressIndicator.tsx",
        "{{componentsDir}}/nativewindui/ProgressIndicator.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/slider",
    name: "NativeWindUI slider",
    description: "A themed native slider wrapper.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "slider"],
    categories: ["forms", "input"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [runtime("@react-native-community/slider", "5.2.0", "expo")],
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Slider.tsx",
        "{{componentsDir}}/nativewindui/Slider.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/toggle",
    name: "NativeWindUI toggle",
    description: "A color-scheme-aware Switch wrapper.",
    kind: "component",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "toggle"],
    categories: ["forms", "controls"],
    compatibility: SDK_56_NATIVEWIND_UI,
    composedItems: ["nativewindui/support"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/Toggle.tsx",
        "{{componentsDir}}/nativewindui/Toggle.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/theme-toggle",
    name: "NativeWindUI theme toggle",
    description:
      "An animated light and dark theme toggle using the shared icon adapter.",
    kind: "animation",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "theme", "toggle", "reanimated"],
    categories: ["theming", "controls", "motion"],
    compatibility: SDK_56_NATIVEWIND_UI,
    dependencies: [runtime("react-native-reanimated", "4.3.1", "expo")],
    composedItems: ["nativewindui/support", "nativewindui/icon"],
    assets: [
      nativeWindUiAsset(
        "src/components/nativewindui/ThemeToggle.tsx",
        "{{componentsDir}}/nativewindui/ThemeToggle.tsx",
      ),
    ],
  }),
  defineItem({
    id: "nativewindui/components",
    name: "NativeWindUI component set",
    description:
      "All completed NativeWindUI components emitted by the supported Super Stack fixture.",
    kind: "integration",
    source: CES_MDS_SOURCE,
    tags: ["nativewindui", "components"],
    categories: ["component-library", "styling"],
    compatibility: SDK_56_NATIVEWIND_UI,
    composedItems: [
      "nativewindui/activity-indicator",
      "nativewindui/avatar",
      "nativewindui/button",
      "nativewindui/date-picker",
      "nativewindui/icon",
      "nativewindui/picker",
      "nativewindui/progress-indicator",
      "nativewindui/slider",
      "nativewindui/text",
      "nativewindui/theme-toggle",
      "nativewindui/toggle",
    ],
    relatedItems: ["mds/exposition", "nativewindui/exposition"],
  }),
  defineItem({
    id: "nativewindui/exposition",
    name: "NativeWindUI exposition",
    description:
      "An interactive screen exercising every completed bundled NativeWindUI primitive.",
    kind: "screen",
    tags: ["nativewindui", "exposition", "eject:exposition"],
    categories: ["exposition", "screens", "component-library"],
    compatibility: {
      ...SDK_56_NATIVEWIND_UI,
      navigation: ["expo-router"],
    },
    composedItems: [
      "nativewindui/components",
      "mds/exposition-components",
      "mds/theme-support",
    ],
    relatedItems: ["mds/exposition"],
    variants: routeVariants(
      "src/app/exposition/nativewindui.tsx",
      "nativewindui",
    ),
    assets: [
      mdsAsset(
        "src/features/exposition/nativewindui-screen.tsx",
        "{{featuresDir}}/exposition/nativewindui-screen.tsx",
      ),
    ],
    integration: {
      summary:
        "Add the development-only exposition route alongside the NativeWindUI component set.",
      instructions: [
        "Remove or eject this demonstration screen before production.",
      ],
    },
  }),
];

const ceaItems: LibraryItem[] = [
  defineItem({
    id: "expo/splash-screen",
    name: "Expo SDK 56 splash screen",
    description:
      "Light and dark splash icons and expo-splash-screen plugin config matching create-expo-app on SDK 56.",
    kind: "integration",
    source: CEA_SOURCE,
    tags: ["expo", "splash", "appearance"],
    categories: ["theming", "support"],
    compatibility: SDK_56_CEA_ASSETS,
    dependencies: [runtime("expo-splash-screen", "~56.0.14", "expo")],
    assets: [
      ceaAsset(
        "assets/images/expo-logo.png",
        "assets/images/splash-icon.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/expo-badge-white.png",
        "assets/images/splash-icon-dark.png",
        "static",
        "binary",
      ),
    ],
    integration: {
      summary:
        "Install the SDK 56 splash icons and configure expo-splash-screen for system light and dark appearance.",
      instructions: [
        "Set expo.userInterfaceStyle to automatic.",
        "Add the expo-splash-screen config plugin with light and dark image and backgroundColor values.",
        "Keep the splash assets under assets/images, matching create-expo-app.",
      ],
    },
  }),
  defineItem({
    id: "expo/theme-support",
    name: "Expo starter theme support",
    description:
      "The SDK 56 starter theme constants, color-scheme hooks, theme hook, and global CSS.",
    kind: "integration",
    source: CEA_SOURCE,
    tags: ["expo", "theme", "starter"],
    categories: ["theming", "support"],
    compatibility: {
      ...SDK_56_ALIAS,
      styling: ["stylesheet"],
    },
    assets: [
      ceaAsset("src/global.css", "src/global.css", "support"),
      ceaAsset("src/constants/theme.ts", "src/constants/theme.ts", "support"),
      ceaAsset(
        "src/hooks/use-color-scheme.ts",
        "src/hooks/use-color-scheme.ts",
        "support",
      ),
      ceaAsset(
        "src/hooks/use-color-scheme.web.ts",
        "src/hooks/use-color-scheme.web.ts",
        "support",
      ),
      ceaAsset("src/hooks/use-theme.ts", "src/hooks/use-theme.ts", "support"),
    ],
    integration: {
      summary:
        "Use the generated @ alias and load the global CSS from the theme constants module.",
      instructions: ["Keep the @ alias mapped to the project src directory."],
    },
  }),
  defineItem({
    id: "expo/themed-text",
    name: "Themed text",
    description:
      "Expo starter text with semantic color and typography variants.",
    kind: "component",
    source: CEA_SOURCE,
    tags: ["expo", "text", "theme"],
    categories: ["typography"],
    compatibility: SDK_56_ALIAS,
    composedItems: ["expo/theme-support"],
    assets: [
      ceaAsset(
        "src/components/themed-text.tsx",
        "{{componentsDir}}/themed-text.tsx",
      ),
    ],
  }),
  defineItem({
    id: "expo/themed-view",
    name: "Themed view",
    description: "Expo starter view with semantic background variants.",
    kind: "component",
    source: CEA_SOURCE,
    tags: ["expo", "view", "theme"],
    categories: ["layout"],
    compatibility: SDK_56_ALIAS,
    composedItems: ["expo/theme-support"],
    assets: [
      ceaAsset(
        "src/components/themed-view.tsx",
        "{{componentsDir}}/themed-view.tsx",
      ),
    ],
  }),
  defineItem({
    id: "expo/external-link",
    name: "External link",
    description:
      "Expo Router link wrapper that opens an in-app browser on native.",
    kind: "component",
    source: CEA_SOURCE,
    tags: ["expo", "link", "browser"],
    categories: ["navigation", "controls"],
    compatibility: { ...SDK_56_ALIAS, navigation: ["expo-router"] },
    dependencies: [
      runtime("expo-router", "~56.2.6", "expo"),
      runtime("expo-web-browser", "~56.0.5", "expo"),
    ],
    assets: [
      ceaAsset(
        "src/components/external-link.tsx",
        "{{componentsDir}}/external-link.tsx",
      ),
    ],
  }),
  defineItem({
    id: "expo/hint-row",
    name: "Hint row",
    description:
      "A two-column instructional row from the Expo starter home screen.",
    kind: "component",
    source: CEA_SOURCE,
    tags: ["expo", "hint", "starter"],
    categories: ["content", "layout"],
    compatibility: SDK_56_ALIAS,
    composedItems: ["expo/themed-text", "expo/themed-view"],
    assets: [
      ceaAsset("src/components/hint-row.tsx", "{{componentsDir}}/hint-row.tsx"),
    ],
  }),
  defineItem({
    id: "expo/collapsible",
    name: "Collapsible",
    description:
      "An animated, themed disclosure component from the Expo explore screen.",
    kind: "animation",
    source: CEA_SOURCE,
    tags: ["expo", "collapsible", "reanimated"],
    categories: ["disclosure", "motion"],
    compatibility: SDK_56_ALIAS,
    dependencies: [
      runtime("expo-symbols", "~56.0.5", "expo"),
      runtime("react-native-reanimated", "4.3.1", "expo"),
    ],
    composedItems: ["expo/themed-text", "expo/themed-view"],
    assets: [
      ceaAsset(
        "src/components/ui/collapsible.tsx",
        "{{componentsDir}}/ui/collapsible.tsx",
      ),
    ],
  }),
  defineItem({
    id: "expo/animated-icon",
    name: "Animated Expo icon",
    description:
      "The SDK 56 starter splash overlay and animated Expo icon for native and web.",
    kind: "animation",
    source: CEA_SOURCE,
    tags: ["expo", "icon", "splash", "reanimated"],
    categories: ["motion", "graphics"],
    compatibility: SDK_56_CEA_ASSETS,
    dependencies: [
      runtime("expo-image", "~56.0.9", "expo"),
      runtime("react-native-reanimated", "4.3.1", "expo"),
      runtime("react-native-worklets", "0.8.3", "expo"),
    ],
    assets: [
      ceaAsset(
        "src/components/animated-icon.tsx",
        "{{componentsDir}}/animated-icon.tsx",
      ),
      ceaAsset(
        "src/components/animated-icon.web.tsx",
        "{{componentsDir}}/animated-icon.web.tsx",
      ),
      ceaAsset(
        "src/components/animated-icon.module.css",
        "{{componentsDir}}/animated-icon.module.css",
        "support",
      ),
      ceaAsset(
        "assets/images/logo-glow.png",
        "assets/images/logo-glow.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/expo-logo.png",
        "assets/images/expo-logo.png",
        "static",
        "binary",
      ),
    ],
  }),
  defineItem({
    id: "expo/web-badge",
    name: "Expo web badge",
    description: "A themed Expo version badge for web layouts.",
    kind: "component",
    source: CEA_SOURCE,
    tags: ["expo", "badge", "web"],
    categories: ["feedback", "graphics"],
    compatibility: SDK_56_CEA_ASSETS,
    dependencies: [runtime("expo-image", "~56.0.9", "expo")],
    composedItems: ["expo/themed-text", "expo/themed-view"],
    assets: [
      ceaAsset(
        "src/components/web-badge.tsx",
        "{{componentsDir}}/web-badge.tsx",
      ),
      ceaAsset(
        "assets/images/expo-badge.png",
        "assets/images/expo-badge.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/expo-badge-white.png",
        "assets/images/expo-badge-white.png",
        "static",
        "binary",
      ),
    ],
  }),
  defineItem({
    id: "expo/app-tabs",
    name: "Expo starter app tabs",
    description:
      "Native Tabs on device and a responsive web tab bar from the SDK 56 starter.",
    kind: "integration",
    source: CEA_SOURCE,
    tags: ["expo", "tabs", "native-tabs", "web"],
    categories: ["navigation"],
    compatibility: {
      ...SDK_56_CEA_ASSETS,
      navigation: ["expo-router"],
      navigationLayout: ["tabs"],
    },
    dependencies: [
      runtime("expo-router", "~56.2.6", "expo"),
      runtime("expo-symbols", "~56.0.5", "expo"),
    ],
    composedItems: [
      "expo/external-link",
      "expo/themed-text",
      "expo/themed-view",
    ],
    assets: [
      ceaAsset("src/components/app-tabs.tsx", "{{componentsDir}}/app-tabs.tsx"),
      ceaAsset(
        "src/components/app-tabs.web.tsx",
        "{{componentsDir}}/app-tabs.web.tsx",
      ),
      ceaAsset(
        "assets/images/tabIcons/home.png",
        "assets/images/tabIcons/home.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/tabIcons/home@2x.png",
        "assets/images/tabIcons/home@2x.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/tabIcons/home@3x.png",
        "assets/images/tabIcons/home@3x.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/tabIcons/explore.png",
        "assets/images/tabIcons/explore.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/tabIcons/explore@2x.png",
        "assets/images/tabIcons/explore@2x.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/tabIcons/explore@3x.png",
        "assets/images/tabIcons/explore@3x.png",
        "static",
        "binary",
      ),
    ],
  }),
  defineItem({
    id: "expo/home-screen",
    name: "Expo starter home screen",
    description:
      "The SDK 56 default welcome screen with device hints and animated branding.",
    kind: "screen",
    source: CEA_SOURCE,
    tags: ["expo", "home", "starter"],
    categories: ["screens", "starter"],
    compatibility: { ...SDK_56_CEA_ASSETS, navigation: ["expo-router"] },
    dependencies: [
      runtime("expo-device", "~56.0.4", "expo"),
      runtime("react-native-safe-area-context", "~5.7.0", "expo"),
    ],
    composedItems: [
      "expo/animated-icon",
      "expo/hint-row",
      "expo/themed-text",
      "expo/themed-view",
      "expo/web-badge",
    ],
    assets: [ceaAsset("src/app/index.tsx", "{{appDir}}/index.tsx", "route")],
  }),
  defineItem({
    id: "expo/explore-screen",
    name: "Expo starter explore screen",
    description:
      "The SDK 56 default educational screen covering routes, platforms, images, and motion.",
    kind: "screen",
    source: CEA_SOURCE,
    tags: ["expo", "explore", "starter"],
    categories: ["screens", "starter"],
    compatibility: { ...SDK_56_CEA_ASSETS, navigation: ["expo-router"] },
    dependencies: [
      runtime("expo-image", "~56.0.9", "expo"),
      runtime("expo-symbols", "~56.0.5", "expo"),
      runtime("react-native-safe-area-context", "~5.7.0", "expo"),
    ],
    composedItems: [
      "expo/collapsible",
      "expo/external-link",
      "expo/themed-text",
      "expo/themed-view",
      "expo/web-badge",
    ],
    assets: [
      ceaAsset("src/app/explore.tsx", "{{appDir}}/explore.tsx", "route"),
      ceaAsset(
        "assets/images/tutorial-web.png",
        "assets/images/tutorial-web.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/react-logo.png",
        "assets/images/react-logo.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/react-logo@2x.png",
        "assets/images/react-logo@2x.png",
        "static",
        "binary",
      ),
      ceaAsset(
        "assets/images/react-logo@3x.png",
        "assets/images/react-logo@3x.png",
        "static",
        "binary",
      ),
    ],
  }),
  defineItem({
    id: "expo/default-starter",
    name: "Expo SDK 56 default starter",
    description:
      "The complete default SDK 56 two-screen Expo Router starter source set.",
    kind: "flow",
    source: CEA_SOURCE,
    tags: ["expo", "starter", "flow"],
    categories: ["starter", "flows"],
    compatibility: {
      ...SDK_56_CEA_ASSETS,
      styling: ["stylesheet"],
      navigation: ["expo-router"],
      navigationLayout: ["tabs"],
    },
    dependencies: [runtime("expo-router", "~56.2.6", "expo")],
    composedItems: ["expo/app-tabs", "expo/home-screen", "expo/explore-screen"],
    assets: [
      ceaAsset("src/app/_layout.tsx", "{{appDir}}/_layout.tsx", "route"),
    ],
    integration: {
      summary:
        "Restore the full editable create-expo-app default starter into an empty SDK 56 app.",
      instructions: [
        "Use only when replacing an empty or identical route tree; customized route files intentionally conflict.",
      ],
    },
  }),
];

const cesBaseItems: LibraryItem[] = [
  defineItem({
    id: "ces/button",
    name: "create-expo-stack button",
    description: "The base create-expo-stack rounded pressable button.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "button"],
    categories: ["controls"],
    compatibility: SDK_56,
    assets: [
      cesAsset("base/components/Button.tsx", "{{componentsDir}}/Button.tsx"),
    ],
  }),
  defineItem({
    id: "ces/container",
    name: "create-expo-stack container",
    description: "The base create-expo-stack safe-area screen container.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "container"],
    categories: ["layout"],
    compatibility: SDK_56,
    assets: [
      cesAsset(
        "base/components/Container.tsx",
        "{{componentsDir}}/Container.tsx",
      ),
    ],
  }),
  defineItem({
    id: "ces/edit-screen-info",
    name: "create-expo-stack edit screen info",
    description: "The default non-localized starter edit instructions.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "starter", "instructions"],
    categories: ["content"],
    compatibility: SDK_56,
    assets: [
      cesAsset(
        "base/components/EditScreenInfo.tsx",
        "{{componentsDir}}/EditScreenInfo.tsx",
      ),
    ],
  }),
  defineItem({
    id: "ces/screen-content",
    name: "create-expo-stack screen content",
    description:
      "The base starter screen layout composed with edit instructions.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "screen"],
    categories: ["layout", "starter"],
    compatibility: SDK_56,
    composedItems: ["ces/edit-screen-info"],
    assets: [
      cesAsset(
        "base/components/ScreenContent.tsx",
        "{{componentsDir}}/ScreenContent.tsx",
      ),
    ],
  }),
  defineItem({
    id: "ces/back-button",
    name: "create-expo-stack back button",
    description: "A compact Feather-icon back action.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "back", "icon"],
    categories: ["navigation", "controls"],
    compatibility: SDK_56,
    dependencies: [runtime("@expo/vector-icons", "^15.0.2", "expo")],
    assets: [
      cesAsset(
        "base/components/BackButton.tsx",
        "{{componentsDir}}/BackButton.tsx",
      ),
    ],
  }),
  defineItem({
    id: "ces/header-button",
    name: "create-expo-stack header button",
    description: "A pressable header info icon.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "header", "icon"],
    categories: ["navigation", "controls"],
    compatibility: SDK_56,
    dependencies: [runtime("@expo/vector-icons", "^15.0.2", "expo")],
    assets: [
      cesAsset(
        "base/components/HeaderButton.tsx",
        "{{componentsDir}}/HeaderButton.tsx",
      ),
    ],
  }),
  defineItem({
    id: "ces/tab-bar-icon",
    name: "create-expo-stack tab bar icon",
    description: "A typed FontAwesome tab bar icon wrapper.",
    kind: "component",
    source: CES_SOURCE,
    tags: ["create-expo-stack", "tabs", "icon"],
    categories: ["navigation", "graphics"],
    compatibility: { ...SDK_56, navigationLayout: ["tabs", "drawer+tabs"] },
    dependencies: [runtime("@expo/vector-icons", "^15.0.2", "expo")],
    assets: [
      cesAsset(
        "base/components/TabBarIcon.tsx",
        "{{componentsDir}}/TabBarIcon.tsx",
      ),
    ],
  }),
];

export const libraryCatalog: readonly LibraryItem[] = [
  ...mdsItems,
  ...nativeWindUiItems,
  ...ceaItems,
  ...cesBaseItems,
];
