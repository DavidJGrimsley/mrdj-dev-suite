import { describe, expect, it } from "vitest";

import {
  getLibraryItem,
  isSafeLibraryAssetPath,
  isSafeLibraryDestination,
  validateLibraryCatalog,
} from "../src/index.js";

import type { LibraryItem } from "../src/index.js";

function fixture(id: string): LibraryItem {
  const original = getLibraryItem("swmansion/svg-mark");
  if (!original) throw new Error("Catalog fixture is missing.");
  return {
    ...original,
    id,
    dependencies: [],
    composedItems: [],
    relatedItems: [],
    variants: [],
  };
}

describe("catalog validation", () => {
  it("validates safe asset and destination paths", () => {
    expect(isSafeLibraryAssetPath("assets/mds/source.tsx")).toBe(true);
    expect(isSafeLibraryAssetPath("../source.tsx")).toBe(false);
    expect(isSafeLibraryAssetPath("assets/../package.json")).toBe(false);
    expect(isSafeLibraryAssetPath("assets\\mds\\source.tsx")).toBe(false);
    expect(isSafeLibraryDestination("{{componentsDir}}/button.tsx")).toBe(true);
    expect(isSafeLibraryDestination("{{unknown}}/button.tsx")).toBe(false);
    expect(isSafeLibraryDestination("../button.tsx")).toBe(false);
    expect(isSafeLibraryDestination("C:/button.tsx")).toBe(false);
  });

  it("detects duplicate and malformed ids", () => {
    const duplicate = fixture("test/item");
    const malformed = fixture("not-namespaced");
    const result = validateLibraryCatalog([duplicate, duplicate, malformed]);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "duplicate-id" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-id" }),
    );
  });

  it("detects missing assets and unsafe destinations", () => {
    const item = fixture("test/assets");
    item.assets = [
      {
        path: "assets/does-not-exist.tsx",
        destination: "../outside.tsx",
        encoding: "utf8",
      },
    ];
    const result = validateLibraryCatalog([item]);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "missing-asset" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-destination" }),
    );
  });

  it("detects unknown composition and cycles", () => {
    const unknown = fixture("test/unknown");
    unknown.composedItems = ["test/missing"];
    const left = fixture("test/left");
    const right = fixture("test/right");
    left.composedItems = [right.id];
    right.composedItems = [left.id];
    const result = validateLibraryCatalog([unknown, left, right]);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "unknown-composed-item" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "composition-cycle" }),
    );
  });

  it("detects duplicate and malformed variants", () => {
    const item = fixture("test/variants");
    item.variants = [
      { id: "Bad Variant", name: "Bad" },
      { id: "Bad Variant", name: "Duplicate" },
    ];
    const result = validateLibraryCatalog([item]);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-variant-id" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "duplicate-variant" }),
    );
  });

  it("requires MIT provenance and complete dependency declarations", () => {
    const item = fixture("test/provenance");
    item.source = {
      ...item.source,
      license: "Proprietary",
      repository: "not-a-url",
    } as unknown as LibraryItem["source"];
    item.dependencies = [
      { name: "", version: "", kind: "runtime", installer: "package-manager" },
    ];
    const result = validateLibraryCatalog([item]);

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-license" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-source" }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "invalid-dependency" }),
    );
  });
});
