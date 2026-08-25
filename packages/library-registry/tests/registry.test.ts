import { describe, expect, it } from "vitest";

import {
  getLibraryItem,
  libraryCatalog,
  listLibraryItems,
  readLibraryAsset,
  resolveLibraryItem,
  searchLibraryItems,
  validateLibraryCatalog,
} from "../src/index.js";

const routerContext = {
  expoSdk: 56,
  navigation: "expo-router" as const,
  navigationLayout: "stack" as const,
  appDirectory: "src/app" as const,
  styling: "stylesheet" as const,
  aliases: { "@": "./src" },
  platforms: ["android", "ios", "web"] as const,
};

describe("MDS Library catalog", () => {
  it("ships a valid, substantial catalog with stable namespaces", () => {
    const result = validateLibraryCatalog(libraryCatalog);

    expect(result).toEqual({ valid: true, issues: [] });
    expect(libraryCatalog.length).toBeGreaterThanOrEqual(45);
    expect(new Set(libraryCatalog.map((item) => item.id)).size).toBe(
      libraryCatalog.length,
    );
    expect(
      libraryCatalog.every((item) => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(item.id)),
    ).toBe(true);
    expect(
      libraryCatalog.every((item) => item.delivery === "source-copy"),
    ).toBe(true);
    expect(libraryCatalog.every((item) => item.source.license === "MIT")).toBe(
      true,
    );
  });

  it("contains the approved MDS, Expo, CES, and NativeWindUI coverage", () => {
    const ids = new Set(listLibraryItems().map((item) => item.id));

    for (const id of [
      "swmansion/animated-pressable",
      "mds/auth",
      "mds/legal-documents",
      "mds/onboarding",
      "mds/onboarding-state",
      "mds/onboarding-auth-supabase",
      "mds/settings",
      "mds/stylist",
      "mds/data-local",
      "mds/exposition",
      "mds/expo-sdk-56",
      "nativewindui/components",
      "nativewindui/exposition",
      "expo/themed-text",
      "expo/splash-screen",
      "expo/default-starter",
      "ces/button",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has("mds/data-supabase")).toBe(false);
    expect(ids.has("mds/exposition-notice")).toBe(false);
  });

  it("ships create-expo-app SDK 56 light and dark splash icons", async () => {
    const item = getLibraryItem("expo/splash-screen");
    expect(item?.tags).not.toContain("eject:stylist");
    expect(item?.tags).not.toContain("eject:exposition");
    expect(item?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "assets/images/splash-icon.png",
          encoding: "binary",
        }),
        expect.objectContaining({
          destination: "assets/images/splash-icon-dark.png",
          encoding: "binary",
        }),
      ]),
    );

    for (const asset of item?.assets ?? []) {
      const contents = await readLibraryAsset(asset);
      expect(contents.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }
  });

  it("returns summaries from list and full metadata from get", () => {
    const summary = listLibraryItems().find(
      (item) => item.id === "mds/onboarding",
    );
    const item = getLibraryItem("mds/onboarding");

    expect(summary).toMatchObject({ kind: "flow", source: { name: "mds" } });
    expect(summary).not.toHaveProperty("assets");
    expect(item?.composedItems).toContain("mds/theme-support");
    expect(item?.assets.length).toBeGreaterThanOrEqual(2);
    expect(
      item?.assets.some((asset) =>
        asset.destination.includes("onboarding-colors"),
      ),
    ).toBe(false);
    expect(item?.variants.map((variant) => variant.id)).toEqual([
      "multi-screen",
      "multi-screen-with-legal",
    ]);
    expect(item?.integration.notes?.join(" ")).toContain(
      "Onboarding UI does not import Zustand or Supabase directly",
    );
    expect(getLibraryItem("missing/item")).toBeUndefined();
  });

  it("filters by kind, source, tag, category, and compatibility", () => {
    expect(
      listLibraryItems({ kind: "animation" }).every(
        (item) => item.kind === "animation",
      ),
    ).toBe(true);
    expect(
      listLibraryItems({ source: "create-expo-app" }).every(
        (item) => item.source.name === "create-expo-app",
      ),
    ).toBe(true);
    expect(
      listLibraryItems({ tags: ["eject:onboarding"] }).map((item) => item.id),
    ).toEqual(["mds/onboarding"]);
    expect(
      listLibraryItems({ tags: ["legal", "privacy"] }).map((item) => item.id),
    ).toEqual(["mds/legal-documents"]);
    const nativeWindEjectIds = listLibraryItems({ tags: ["eject:exposition"] })
      .map((item) => item.id)
      .filter((id) => id.startsWith("nativewindui/"));
    expect(nativeWindEjectIds).toEqual(["nativewindui/exposition"]);
    expect(
      listLibraryItems({ categories: ["theming"] }).length,
    ).toBeGreaterThan(1);
    expect(
      listLibraryItems({
        source: ["mds"],
        compatibleWith: { ...routerContext, expoSdk: 55 },
      }),
    ).toEqual([]);
  });

  it("searches across ids, names, descriptions, tags, categories, and source", () => {
    expect(searchLibraryItems("swmansion/svg-mark")[0]?.id).toBe("swmansion/svg-mark");
    expect(searchLibraryItems("keyboard form")[0]?.id).toBe(
      "swmansion/keyboard-form",
    );
    expect(
      searchLibraryItems("create-expo-stack icon").some(
        (item) => item.id === "ces/tab-bar-icon",
      ),
    ).toBe(true);
    expect(searchLibraryItems("legal privacy terms")[0]?.id).toBe(
      "mds/legal-documents",
    );
    expect(
      searchLibraryItems("nativewindui picker", { kind: "component" }).length,
    ).toBeGreaterThan(1);
    expect(searchLibraryItems("term-that-does-not-exist")).toEqual([]);
  });
});

describe("library resolution", () => {
  it("expands composed items dependency-first and de-duplicates assets and dependencies", () => {
    const result = resolveLibraryItem("mds/exposition", routerContext);
    const itemIds = result.items.map((item) => item.id);

    expect(result.compatible).toBe(true);
    expect(itemIds.at(-1)).toBe("mds/exposition");
    expect(itemIds.indexOf("mds/theme-support")).toBeLessThan(
      itemIds.indexOf("mds/package-card"),
    );
    expect(new Set(result.assets.map((value) => value.destination)).size).toBe(
      result.assets.length,
    );
    expect(
      new Set(result.dependencies.map((dependency) => dependency.name)).size,
    ).toBe(result.dependencies.length);
  });

  it("keeps missing installable dependencies informational", () => {
    const result = resolveLibraryItem("swmansion/svg-mark", { expoSdk: 56 });

    expect(result.compatible).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "missing-dependency",
        severity: "info",
        dependency: "react-native-svg",
      }),
    );
  });

  it("rejects incompatible SDKs, styling systems, layouts, and installed versions", () => {
    expect(resolveLibraryItem("swmansion/svg-mark", { expoSdk: 55 }).compatible).toBe(
      false,
    );
    expect(
      resolveLibraryItem("nativewindui/button", {
        expoSdk: 56,
        styling: "stylesheet",
      }).issues,
    ).toContainEqual(expect.objectContaining({ code: "unsupported-styling" }));
    expect(
      resolveLibraryItem("expo/default-starter", {
        ...routerContext,
        navigationLayout: "stack",
      }).issues,
    ).toContainEqual(
      expect.objectContaining({ code: "unsupported-navigation-layout" }),
    );
    expect(
      resolveLibraryItem("nativewindui/avatar", {
        expoSdk: 56,
        styling: "nativewindui",
        aliases: { "@": "./src" },
        dependencies: { "@rn-primitives/avatar": "^1.3.0" },
      }).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "dependency-version-conflict",
        dependency: "@rn-primitives/avatar",
      }),
    );
  });

  it("uses conservative caret, tilde, and zero-major lower bounds", () => {
    expect(
      resolveLibraryItem("nativewindui/avatar", {
        expoSdk: 56,
        styling: "nativewindui",
        aliases: { "@": "./src" },
        dependencies: { "@rn-primitives/avatar": "^1.5.0" },
      }).issues.some(
        (issue) =>
          issue.dependency === "@rn-primitives/avatar" &&
          issue.severity === "error",
      ),
    ).toBe(false);
    expect(
      resolveLibraryItem("nativewindui/icon", {
        expoSdk: 56,
        styling: "nativewindui",
        aliases: { "@": "./src" },
        dependencies: { "rn-icon-mapper": "^0.0.2" },
      }).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "dependency-version-conflict",
        dependency: "rn-icon-mapper",
      }),
    );
    expect(
      resolveLibraryItem("mds/onboarding", {
        ...routerContext,
        dependencies: { "expo-router": "~56.1.9" },
      }).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "dependency-version-conflict",
        dependency: "expo-router",
      }),
    );
  });

  it("selects safe route variants for app and src/app layouts", async () => {
    const rootStack = resolveLibraryItem("mds/data-local", {
      ...routerContext,
      appDirectory: "app",
    });
    const srcStack = resolveLibraryItem("mds/data-local", routerContext);
    const tabs = resolveLibraryItem("mds/exposition", {
      ...routerContext,
      navigationLayout: "tabs",
    });
    const drawerTabs = resolveLibraryItem("mds/exposition", {
      ...routerContext,
      navigationLayout: "drawer+tabs",
    });

    expect(
      rootStack.assets.some(
        (value) => value.destination === "app/exposition/data.tsx",
      ),
    ).toBe(true);
    expect(
      srcStack.assets.some(
        (value) => value.destination === "src/app/exposition/data.tsx",
      ),
    ).toBe(true);
    expect(
      tabs.assets.some(
        (value) => value.destination === "src/app/(tabs)/exposition.tsx",
      ),
    ).toBe(true);
    expect(
      drawerTabs.assets.some(
        (value) => value.destination === "src/app/(drawer)/(tabs)/index.tsx",
      ),
    ).toBe(true);
    const route = rootStack.assets.find(
      (value) => value.destination === "app/exposition/data.tsx",
    );
    expect(route).toBeDefined();
    expect((await readLibraryAsset(route!)).toString("utf8")).toContain(
      "from '@/features/",
    );
  });

  it("resolves legal documents as public routes by default with reusable variants", async () => {
    const legal = resolveLibraryItem("mds/legal-documents", routerContext);
    const viewerOnly = resolveLibraryItem("mds/legal-documents", routerContext, {
      variant: "viewer-only",
    });
    const settingsLinks = resolveLibraryItem("mds/legal-documents", routerContext, {
      variant: "settings-links",
    });
    const onboardingAgreement = resolveLibraryItem(
      "mds/legal-documents",
      routerContext,
      { variant: "onboarding-agreement" },
    );
    const updateGate = resolveLibraryItem("mds/legal-documents", routerContext, {
      variant: "legal-update-gate",
    });

    expect(legal.compatible).toBe(true);
    expect(legal.variant?.id).toBe("public-routes");
    expect(getLibraryItem("mds/legal-documents")?.variants.map((variant) => variant.id)).toEqual([
      "public-routes",
      "viewer-only",
      "onboarding-agreement",
      "settings-links",
      "legal-update-gate",
    ]);
    expect(legal.items.map((item) => item.id)).toContain("mds/theme-support");
    expect(legal.items.at(-1)?.id).toBe("mds/legal-documents");
    expect(legal.dependencies).toContainEqual(
      expect.objectContaining({ name: "expo-router" }),
    );
    expect(legal.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/legal/legal-documents.ts",
          contentTokens: ["__MDS_APP_NAME__"],
        }),
        expect.objectContaining({
          destination: "src/features/legal/legal-document-modal.tsx",
        }),
        expect.objectContaining({ destination: "src/app/terms.tsx" }),
        expect.objectContaining({ destination: "src/app/privacy.tsx" }),
      ]),
    );

    expect(viewerOnly.compatible).toBe(true);
    expect(viewerOnly.variant?.id).toBe("viewer-only");
    expect(viewerOnly.assets.some((asset) => asset.role === "route")).toBe(
      false,
    );
    expect(
      viewerOnly.assets.some((asset) =>
        asset.destination.endsWith("legal-document-links.tsx"),
      ),
    ).toBe(false);

    expect(settingsLinks.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/legal/legal-document-links.tsx",
        }),
        expect.objectContaining({ destination: "src/app/terms.tsx" }),
        expect.objectContaining({ destination: "src/app/privacy.tsx" }),
      ]),
    );
    expect(onboardingAgreement.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/legal/legal-agreement-screen.tsx",
        }),
        expect.objectContaining({
          destination: "src/app/onboarding/legal-agreement.tsx",
        }),
      ]),
    );
    expect(updateGate.variant?.id).toBe("legal-update-gate");
    expect(updateGate.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "src/app/legal/updates.tsx" }),
        expect.objectContaining({
          destination: "src/features/legal/legal-acceptance-adapter.ts",
        }),
        expect.objectContaining({
          destination: "src/features/legal/legal-update-screen.tsx",
        }),
        expect.objectContaining({ destination: "src/app/terms.tsx" }),
        expect.objectContaining({ destination: "src/app/privacy.tsx" }),
      ]),
    );

    const documentAsset = legal.assets.find(
      (asset) => asset.destination === "src/features/legal/legal-documents.ts",
    );
    expect(documentAsset).toBeDefined();
    const documentSource = (await readLibraryAsset(documentAsset!)).toString(
      "utf8",
    );
    expect(documentSource).toContain("not legal advice");
    expect(documentSource).toContain("__MDS_APP_NAME__");
    expect(documentSource).toContain("acceptanceVersion");
    expect(documentSource).toContain("requiresReacceptance");
    expect(documentSource).toContain("changeSummary");

    const updateScreenAsset = updateGate.assets.find(
      (asset) => asset.destination === "src/features/legal/legal-update-screen.tsx",
    );
    expect(updateScreenAsset).toBeDefined();
    const updateScreenSource = (await readLibraryAsset(updateScreenAsset!)).toString("utf8");
    expect(updateScreenSource).toContain("Review required document updates");
    expect(updateScreenSource).toContain("LegalDocumentModal");

    const providerAsset = legal.assets.find(
      (asset) => asset.destination === "src/theme/provider.tsx",
    );
    const viewAsset = legal.assets.find(
      (asset) =>
        asset.destination === "src/features/legal/legal-document-view.tsx",
    );
    expect(providerAsset).toBeDefined();
    expect(viewAsset).toBeDefined();
    const providerSource = (await readLibraryAsset(providerAsset!)).toString(
      "utf8",
    );
    expect(providerSource).toContain("scheme = 'system'");
    expect(providerSource).toContain("AppThemeColorOverrides");
    const viewSource = (await readLibraryAsset(viewAsset!)).toString("utf8");
    expect(viewSource).toContain("maxWidth: 920");
    expect(viewSource).toContain("alignItems: 'center'");
    expect(legal.integration).toContainEqual(
      expect.stringContaining("root Expo Router layout renders Tabs"),
    );
    expect(updateGate.integration).toContainEqual(
      expect.stringContaining("Stack.Protected"),
    );
  });

  it("resolves the auth library with base and provider variants", async () => {
    const base = resolveLibraryItem("mds/auth", routerContext);
    const supabase = resolveLibraryItem("mds/auth", routerContext, {
      variant: "with-supabase",
    });
    const firebase = resolveLibraryItem("mds/auth", routerContext, {
      variant: "with-firebase",
    });
    const convex = resolveLibraryItem("mds/auth", routerContext, {
      variant: "with-convex",
    });

    expect(base.compatible).toBe(true);
    expect(base.variant?.id).toBe("base");
    expect(getLibraryItem("mds/auth")?.variants.map((variant) => variant.id)).toEqual([
      "base",
      "with-supabase",
      "with-firebase",
      "with-convex",
    ]);
    expect(base.items.map((item) => item.id)).toContain("mds/theme-support");
    expect(base.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/auth/auth-adapter.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/auth/auth-provider.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/auth/auth-screen.tsx",
        }),
        expect.objectContaining({ destination: "src/app/(auth)/sign-in.tsx" }),
        expect.objectContaining({ destination: "src/app/(auth)/sign-up.tsx" }),
        expect.objectContaining({
          destination: "src/app/(auth)/reset-password.tsx",
        }),
        expect.objectContaining({ destination: "project/auth.md" }),
      ]),
    );

    expect(supabase.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "@supabase/supabase-js" }),
        expect.objectContaining({
          name: "@react-native-async-storage/async-storage",
        }),
      ]),
    );
    expect(supabase.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "src/services/supabase.ts" }),
        expect.objectContaining({ destination: ".env.example" }),
        expect.objectContaining({
          destination: "supabase/migrations/0001_mds_auth_onboarding.sql",
        }),
      ]),
    );
    expect(firebase.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "firebase" }),
        expect.objectContaining({
          name: "@react-native-async-storage/async-storage",
        }),
      ]),
    );
    expect(firebase.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "src/services/firebase.ts" }),
        expect.objectContaining({ destination: ".env.example" }),
      ]),
    );
    expect(convex.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "convex" }),
        expect.objectContaining({ name: "@convex-dev/auth" }),
        expect.objectContaining({ name: "@auth/core" }),
        expect.objectContaining({ name: "expo-secure-store" }),
      ]),
    );
    expect(convex.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "src/services/convex.ts" }),
        expect.objectContaining({ destination: ".env.example" }),
      ]),
    );
    const convexServiceAsset = convex.assets.find(
      (asset) => asset.destination === "src/services/convex.ts",
    );
    expect(convexServiceAsset).toBeDefined();
    const convexServiceSource = (await readLibraryAsset(convexServiceAsset!)).toString("utf8");
    expect(convexServiceSource).toContain("getConvexClient");
    expect(convexServiceSource).not.toContain("example.convex.cloud");

    const convexAdapterAsset = convex.assets.find(
      (asset) => asset.destination === "src/features/auth/auth-adapter.tsx",
    );
    expect(convexAdapterAsset).toBeDefined();
    const convexAdapterSource = (await readLibraryAsset(convexAdapterAsset!)).toString("utf8");
    expect(convexAdapterSource).toContain("MissingConvexAuthAdapterProvider");
    expect(convexAdapterSource).toContain("!isConvexConfigured");

    const authProviderAsset = base.assets.find(
      (asset) => asset.destination === "src/features/auth/auth-provider.tsx",
    );
    expect(authProviderAsset).toBeDefined();
    const authProviderSource = (await readLibraryAsset(authProviderAsset!)).toString("utf8");
    expect(authProviderSource).toContain("AuthAdapterProvider");
    expect(authProviderSource).toContain("useAuth");

    const authScreenAsset = base.assets.find(
      (asset) => asset.destination === "src/features/auth/auth-screen.tsx",
    );
    expect(authScreenAsset).toBeDefined();
    const authScreenSource = (await readLibraryAsset(authScreenAsset!)).toString("utf8");
    expect(authScreenSource).toContain("backgroundColor: colors.background");
    expect(authScreenSource).toContain("color: colors.text");
    expect(authScreenSource).not.toContain("color: '#111827'");
    expect(authScreenSource).not.toContain("backgroundColor: '#ffffff'");
  });

  it("resolves production onboarding variants", async () => {
    const onboarding = resolveLibraryItem("mds/onboarding", routerContext);
    const withLegal = resolveLibraryItem("mds/onboarding", routerContext, {
      variant: "multi-screen-with-legal",
    });

    expect(onboarding.compatible).toBe(true);
    expect(onboarding.variant?.id).toBe("multi-screen");
    expect(onboarding.items.map((item) => item.id)).toContain("mds/theme-support");
    expect(onboarding.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/onboarding/onboarding-config.ts",
          contentTokens: ["__MDS_APP_NAME__"],
        }),
        expect.objectContaining({
          destination: "src/theme/color-utils.ts",
        }),
        expect.objectContaining({
          destination: "src/features/onboarding/welcome-screen.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/onboarding/features-screen.tsx",
        }),
        expect.objectContaining({ destination: "src/app/onboarding.tsx" }),
        expect.objectContaining({
          destination: "src/app/onboarding/features.tsx",
        }),
        expect.objectContaining({
          destination: "src/app/onboarding/complete.tsx",
        }),
      ]),
    );
    expect(
      onboarding.assets.some((asset) =>
        asset.destination.includes("account-setup"),
      ),
    ).toBe(false);
    const featuresScreen = onboarding.assets.find(
      (asset) => asset.destination === "src/features/onboarding/features-screen.tsx",
    );
    expect(featuresScreen).toBeDefined();
    const featuresSource = (await readLibraryAsset(featuresScreen!)).toString("utf8");
    expect(featuresSource).toContain("featureHighlights");
    expect(featuresSource).not.toContain('accessibilityRole="checkbox"');
    expect(featuresSource).not.toContain('accessibilityRole="radio"');

    expect(withLegal.compatible).toBe(true);
    expect(withLegal.variant?.id).toBe("multi-screen-with-legal");
    expect(withLegal.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["mds/legal-documents", "mds/onboarding", "mds/onboarding-state"]),
    );
    expect(withLegal.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/onboarding/legal-review-screen.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/onboarding/features-screen.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/legal/legal-document-modal.tsx",
        }),
        expect.objectContaining({
          destination: "src/features/legal/legal-acceptance-adapter.ts",
        }),
        expect.objectContaining({
          destination: "src/features/onboarding-state/onboarding-state-adapter.ts",
        }),
        expect.objectContaining({ destination: "src/app/onboarding/features.tsx" }),
        expect.objectContaining({ destination: "src/app/onboarding/legal.tsx" }),
        expect.objectContaining({ destination: "src/app/terms.tsx" }),
        expect.objectContaining({ destination: "src/app/privacy.tsx" }),
      ]),
    );
    const legalReview = withLegal.assets.find(
      (asset) => asset.destination === "src/features/onboarding/legal-review-screen.tsx",
    );
    expect(legalReview).toBeDefined();
    expect((await readLibraryAsset(legalReview!)).toString("utf8")).toContain(
      "../legal/legal-document-modal",
    );
    expect(withLegal.assets.some((asset) => asset.destination.includes("preferences"))).toBe(
      false,
    );
    expect(withLegal.assets.some((asset) => asset.destination === "src/app/onboarding/complete.tsx")).toBe(
      false,
    );
  });

  it("resolves onboarding persistence variants and the supabase composition", async () => {
    const memory = resolveLibraryItem("mds/onboarding-state", routerContext);
    const zustandLocal = resolveLibraryItem("mds/onboarding-state", routerContext, {
      variant: "zustand-local",
    });
    const supabase = resolveLibraryItem("mds/onboarding-state", routerContext, {
      variant: "supabase",
    });
    const zustandSupabase = resolveLibraryItem("mds/onboarding-state", routerContext, {
      variant: "zustand-supabase",
    });
    const composition = resolveLibraryItem("mds/onboarding-auth-supabase", routerContext);

    expect(memory.variant?.id).toBe("memory");
    expect(getLibraryItem("mds/onboarding-state")?.variants.map((variant) => variant.id)).toEqual([
      "memory",
      "zustand-local",
      "supabase",
      "zustand-supabase",
    ]);
    expect(zustandLocal.dependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "zustand" })]),
    );
    expect(supabase.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/onboarding-state/onboarding-state-supabase.ts",
        }),
      ]),
    );
    expect(zustandSupabase.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/onboarding-state/onboarding-state-zustand-supabase.ts",
        }),
      ]),
    );
    expect(composition.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "mds/onboarding",
        "mds/legal-documents",
        "mds/auth",
        "mds/onboarding-state",
      ]),
    );
    expect(composition.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: "src/features/onboarding/onboarding-persistence-sync.tsx",
        }),
      ]),
    );
    const sql = supabase.assets.find((asset) =>
      asset.destination.endsWith("0001_mds_auth_onboarding.sql"),
    );
    expect(sql).toBeUndefined();

    const authSupabase = resolveLibraryItem("mds/auth", routerContext, {
      variant: "with-supabase",
    });
    expect(authSupabase.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: ".env.example" }),
      ]),
    );
    const sqlAsset = authSupabase.assets.find(
      (asset) => asset.destination === "supabase/migrations/0001_mds_auth_onboarding.sql",
    );
    expect(sqlAsset).toBeDefined();
    const sqlSource = (await readLibraryAsset(sqlAsset!)).toString("utf8");
    expect(sqlSource).toContain("document_version");
    expect(sqlSource).toContain("flow_version");
    expect(sqlSource).toContain("Users can insert their onboarding state");
    expect(sqlSource).not.toContain("for all");
    expect(sqlSource).not.toContain("service_role");
    expect(sqlSource).not.toContain("sb_secret");

    const firebase = resolveLibraryItem("mds/auth", routerContext, {
      variant: "with-firebase",
    });
    expect(
      firebase.assets.some((asset) =>
        asset.destination.includes("onboarding-state-supabase"),
      ),
    ).toBe(false);
  });

  it("restores the completed NativeWindUI exposition with its component graph", () => {
    const result = resolveLibraryItem("nativewindui/exposition", {
      ...routerContext,
      styling: "nativewindui",
      navigationLayout: "tabs",
    });

    expect(result.compatible).toBe(true);
    expect(result.items.some((item) => item.id === "nativewindui/components")).toBe(
      true,
    );
    expect(
      result.assets.some(
        (value) =>
          value.destination ===
          "src/features/exposition/nativewindui-screen.tsx",
      ),
    ).toBe(true);
    expect(
      result.assets.some(
        (value) => value.destination === "src/app/(tabs)/nativewindui.tsx",
      ),
    ).toBe(true);
  });

  it("selects a navigation-neutral settings screen for React Navigation", () => {
    const result = resolveLibraryItem("mds/settings", {
      expoSdk: 56,
      navigation: "react-navigation",
      aliases: {},
    });

    expect(result.compatible).toBe(true);
    expect(result.variant?.id).toBe("react-navigation");
    expect(result.assets.some((value) => value.role === "route")).toBe(false);
    expect(result.integration.join(" ")).toContain("React Navigation");
  });

  it("restores settings and stylist screens without relying on the exposition barrel", async () => {
    const settings = resolveLibraryItem("mds/settings", routerContext);
    const stylist = resolveLibraryItem("mds/stylist", routerContext);
    const settingsScreen = settings.assets.find((value) =>
      value.destination.endsWith("settings/settings-screen.tsx"),
    );
    const stylistScreen = stylist.assets.find((value) =>
      value.destination.endsWith("exposition/stylist-screen.tsx"),
    );

    expect(settingsScreen).toBeDefined();
    expect(stylistScreen).toBeDefined();
    expect((await readLibraryAsset(settingsScreen!)).toString("utf8")).toContain(
      "components/swmansion/keyboard-form",
    );
    expect((await readLibraryAsset(stylistScreen!)).toString("utf8")).toContain(
      "components/swmansion/animated-pressable",
    );
    expect((await readLibraryAsset(settingsScreen!)).toString("utf8")).not.toContain(
      "components/exposition';",
    );
    expect((await readLibraryAsset(stylistScreen!)).toString("utf8")).not.toContain(
      "components/exposition';",
    );
  });

  it("hydrates theme from system appearance and uses semantic colors in exposition pages", async () => {
    const themeSupport = resolveLibraryItem("mds/theme-support", routerContext);
    const stylist = resolveLibraryItem("mds/stylist", routerContext);
    const exposition = resolveLibraryItem("mds/exposition", routerContext);
    const expoSdk56 = resolveLibraryItem("mds/expo-sdk-56", routerContext);
    const dataLocal = resolveLibraryItem("mds/data-local", routerContext);

    const providerAsset = themeSupport.assets.find(
      (asset) => asset.destination === "src/theme/provider.tsx",
    );
    const stylistAsset = stylist.assets.find(
      (asset) => asset.destination === "src/features/exposition/stylist-screen.tsx",
    );
    const expositionAsset = exposition.assets.find(
      (asset) => asset.destination === "src/features/exposition/exposition-screen.tsx",
    );
    const sdk56Asset = expoSdk56.assets.find(
      (asset) => asset.destination === "src/features/exposition/expo-sdk-56-screen.tsx",
    );
    const dataAsset = dataLocal.assets.find(
      (asset) => asset.destination === "src/features/exposition/data-screen.tsx",
    );

    expect(providerAsset).toBeDefined();
    expect(stylistAsset).toBeDefined();
    expect(expositionAsset).toBeDefined();
    expect(sdk56Asset).toBeDefined();
    expect(dataAsset).toBeDefined();

    const providerSource = (await readLibraryAsset(providerAsset!)).toString("utf8");
    const stylistSource = (await readLibraryAsset(stylistAsset!)).toString("utf8");
    const expositionSource = (await readLibraryAsset(expositionAsset!)).toString("utf8");
    const sdk56Source = (await readLibraryAsset(sdk56Asset!)).toString("utf8");
    const dataSource = (await readLibraryAsset(dataAsset!)).toString("utf8");

    expect(providerSource).toContain("scheme = 'system'");
    expect(providerSource).toContain("Appearance.getColorScheme");
    expect(providerSource).toContain("export function readSystemScheme");
    expect(providerSource).toContain("if (preference === 'preview')");
    expect(providerSource).not.toContain(
      "activeScheme: defaultThemeTokens.colorSystem.previewScheme",
    );
    expect(providerSource).toContain("return readSystemScheme() ?? 'light'");

    expect(stylistSource).toContain("function updatePreviewScheme");
    expect(stylistSource).toContain("userOverrodePreview");
    expect(stylistSource).toContain("readSystemScheme");
    expect(stylistSource).toContain("payload.theme");

    expect(expositionSource).toContain("{ color: colors.secondary }");
    expect(expositionSource).not.toContain("#1d4ed8");
    expect(sdk56Source).toContain("{ color: colors.secondary }");
    expect(sdk56Source).not.toContain("#1d4ed8");
    expect(sdk56Source).not.toContain("#eff6ff");
    expect(sdk56Source).not.toContain("#bfdbfe");
    expect(dataSource).toContain("backgroundColor: colors.secondary");
  });

  it("includes stylist sync support and expo-router on routed variants", () => {
    const stylist = getLibraryItem("mds/stylist");
    const syncSupport = getLibraryItem("mds/stylist-sync-support");

    expect(stylist?.composedItems).toContain("mds/stylist-sync-support");
    expect(syncSupport?.dependencies).toContainEqual(
      expect.objectContaining({
        name: "@mr.dj2u/cli",
        kind: "development",
      }),
    );
    expect(syncSupport?.assets).toContainEqual(
      expect.objectContaining({
        destination: "scripts/stylist-sync-android.mjs",
      }),
    );
    expect(stylist?.variants.every((variant) =>
      variant.dependencies?.some((dependency) => dependency.name === "expo-router"),
    )).toBe(true);
    expect(
      getLibraryItem("mds/theme-support")?.tags.includes("eject:shared"),
    ).toBe(false);
  });

  it("requires the @ alias for alias-based MDS routes", () => {
    const result = resolveLibraryItem("mds/onboarding", {
      ...routerContext,
      aliases: {},
    });

    expect(result.compatible).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "missing-alias" }),
    );
  });

  it("requires the dedicated Expo starter asset alias only for items that use it", () => {
    const aliases = { "@": "./src" };
    const animated = resolveLibraryItem("expo/animated-icon", {
      expoSdk: 56,
      aliases,
    });
    const themedText = resolveLibraryItem("expo/themed-text", {
      expoSdk: 56,
      aliases,
    });

    expect(animated.compatible).toBe(false);
    expect(animated.issues).toContainEqual(
      expect.objectContaining({
        code: "missing-alias",
        message: expect.stringContaining("@/assets"),
      }),
    );
    expect(themedText.compatible).toBe(true);
  });

  it("surfaces existing destinations without treating them as incompatibility", () => {
    const result = resolveLibraryItem("swmansion/svg-mark", {
      expoSdk: 56,
      files: ["src\\components\\swmansion\\svg-mark.tsx"],
    });

    expect(result.compatible).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "destination-exists",
        path: "src/components/swmansion/svg-mark.tsx",
      }),
    );
  });

  it("rejects unsafe destination roots and unknown variants", () => {
    const unsafe = resolveLibraryItem("swmansion/svg-mark", {
      expoSdk: 56,
      componentsDirectory: "../outside",
    });
    const unknownVariant = resolveLibraryItem("mds/data-local", routerContext, {
      variant: "missing",
    });

    expect(unsafe.compatible).toBe(false);
    expect(unsafe.issues).toContainEqual(
      expect.objectContaining({ code: "unsafe-destination" }),
    );
    expect(unknownVariant.compatible).toBe(false);
    expect(unknownVariant.issues).toContainEqual(
      expect.objectContaining({ code: "unknown-variant" }),
    );
    expect(() => resolveLibraryItem("unknown/item")).toThrow(
      "Unknown library item",
    );
  });
});

describe("bundled asset reader", () => {
  it("reads source as bytes and preserves binary image data", async () => {
    const sourceAsset = getLibraryItem("swmansion/svg-mark")?.assets[0];
    const binaryAsset = getLibraryItem("expo/animated-icon")?.assets.find(
      (value) => value.encoding === "binary",
    );

    expect(sourceAsset).toBeDefined();
    expect(binaryAsset).toBeDefined();
    expect((await readLibraryAsset(sourceAsset!)).toString("utf8")).toContain(
      "react-native-svg",
    );
    expect(
      Array.from((await readLibraryAsset(binaryAsset!)).subarray(0, 8)),
    ).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("rejects traversal, absolute paths, and non-asset paths", async () => {
    await expect(readLibraryAsset("../package.json")).rejects.toThrow("Unsafe");
    await expect(
      readLibraryAsset("C:/Windows/System32/drivers/etc/hosts"),
    ).rejects.toThrow("Unsafe");
    await expect(readLibraryAsset("src/index.ts")).rejects.toThrow("Unsafe");
  });

  it("ships no dogfood values, absolute workspace paths, or embedded secrets", async () => {
    const textAssets = libraryCatalog
      .flatMap((item) => [
        ...item.assets,
        ...item.variants.flatMap((variant) => variant.assets ?? []),
      ])
      .filter((value) => value.encoding === "utf8");
    const contents = await Promise.all(
      textAssets.map((value) => readLibraryAsset(value)),
    );
    const combined = contents.map((value) => value.toString("utf8")).join("\n");

    expect(combined).not.toContain("name: 'Experimental'");
    expect(combined).not.toContain("Scientists and people learning");
    expect(combined).not.toMatch(/[A-Za-z]:\\SoftwareDev\\/);
    expect(combined).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(combined).toContain("__MDS_APP_NAME__ Stylist");
  });
});
