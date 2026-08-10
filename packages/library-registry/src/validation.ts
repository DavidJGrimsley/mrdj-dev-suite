import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  LibraryAsset,
  LibraryCatalogValidationIssue,
  LibraryCatalogValidationResult,
  LibraryItem,
} from "./types.js";

const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const VARIANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DESTINATION_TOKENS = [
  "{{appDir}}",
  "{{componentsDir}}",
  "{{featuresDir}}",
] as const;

export function isSafeLibraryAssetPath(assetPath: string): boolean {
  if (
    !assetPath.startsWith("assets/") ||
    assetPath.includes("\\") ||
    assetPath.includes("\0")
  ) {
    return false;
  }
  if (path.posix.isAbsolute(assetPath) || /^[A-Za-z]:/.test(assetPath)) {
    return false;
  }
  const segments = assetPath.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

export function isSafeLibraryDestination(destination: string): boolean {
  if (
    !destination ||
    destination.includes("\\") ||
    destination.includes("\0")
  ) {
    return false;
  }
  let rendered = destination;
  for (const token of DESTINATION_TOKENS) {
    rendered = rendered.split(token).join("registry-root");
  }
  if (/\{\{[^{}]+\}\}/.test(rendered)) {
    return false;
  }
  if (path.posix.isAbsolute(rendered) || /^[A-Za-z]:/.test(rendered)) {
    return false;
  }
  const segments = rendered.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function validateAsset(
  item: LibraryItem,
  value: LibraryAsset,
  issues: LibraryCatalogValidationIssue[],
): void {
  if (!isSafeLibraryAssetPath(value.path)) {
    issues.push({
      code: "invalid-asset-path",
      itemId: item.id,
      path: value.path,
      message: `Asset path must remain below assets/: ${value.path}`,
    });
  } else if (!existsSync(path.resolve(PACKAGE_ROOT, value.path))) {
    issues.push({
      code: "missing-asset",
      itemId: item.id,
      path: value.path,
      message: `Bundled asset does not exist: ${value.path}`,
    });
  }

  if (!isSafeLibraryDestination(value.destination)) {
    issues.push({
      code: "invalid-destination",
      itemId: item.id,
      path: value.destination,
      message: `Destination must be a safe project-relative path: ${value.destination}`,
    });
  }
}

export function validateLibraryCatalog(
  items: readonly LibraryItem[],
): LibraryCatalogValidationResult {
  const issues: LibraryCatalogValidationIssue[] = [];
  const byId = new Map<string, LibraryItem>();

  for (const item of items) {
    if (!ITEM_ID_PATTERN.test(item.id)) {
      issues.push({
        code: "invalid-id",
        itemId: item.id,
        message: `Invalid item id: ${item.id}`,
      });
    }
    if (byId.has(item.id)) {
      issues.push({
        code: "duplicate-id",
        itemId: item.id,
        message: `Duplicate item id: ${item.id}`,
      });
    } else {
      byId.set(item.id, item);
    }
    if (item.source.license !== "MIT") {
      issues.push({
        code: "invalid-license",
        itemId: item.id,
        message: `${item.id} is not approved for source-copy redistribution.`,
      });
    }
    if (
      !item.source.version.trim() ||
      !item.source.repository.startsWith("https://") ||
      !item.source.displayName.trim()
    ) {
      issues.push({
        code: "invalid-source",
        itemId: item.id,
        message: `${item.id} must declare complete source provenance.`,
      });
    }

    for (const dependency of item.dependencies) {
      if (!dependency.name.trim() || !dependency.version.trim()) {
        issues.push({
          code: "invalid-dependency",
          itemId: item.id,
          message: `${item.id} contains an incomplete dependency declaration.`,
        });
      }
    }
    for (const value of item.assets) {
      validateAsset(item, value, issues);
    }

    const variantIds = new Set<string>();
    for (const variant of item.variants) {
      if (!VARIANT_ID_PATTERN.test(variant.id)) {
        issues.push({
          code: "invalid-variant-id",
          itemId: item.id,
          message: `Invalid variant id ${variant.id} on ${item.id}.`,
        });
      }
      if (variantIds.has(variant.id)) {
        issues.push({
          code: "duplicate-variant",
          itemId: item.id,
          message: `Duplicate variant ${variant.id} on ${item.id}.`,
        });
      }
      variantIds.add(variant.id);
      for (const dependency of variant.dependencies ?? []) {
        if (!dependency.name.trim() || !dependency.version.trim()) {
          issues.push({
            code: "invalid-dependency",
            itemId: item.id,
            message: `${item.id}/${variant.id} contains an incomplete dependency declaration.`,
          });
        }
      }
      for (const value of variant.assets ?? []) {
        validateAsset(item, value, issues);
      }
    }
  }

  for (const item of items) {
    for (const relatedId of item.relatedItems) {
      if (!byId.has(relatedId)) {
        issues.push({
          code: "unknown-related-item",
          itemId: item.id,
          message: `${item.id} references unknown related item ${relatedId}.`,
        });
      }
    }
    for (const composedId of [
      ...item.composedItems,
      ...item.variants.flatMap((variant) => variant.composedItems ?? []),
    ]) {
      if (!byId.has(composedId)) {
        issues.push({
          code: "unknown-composed-item",
          itemId: item.id,
          message: `${item.id} composes unknown item ${composedId}.`,
        });
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const findCycle = (itemId: string): void => {
    if (visiting.has(itemId)) {
      issues.push({
        code: "composition-cycle",
        itemId,
        message: `Composition cycle includes ${itemId}.`,
      });
      return;
    }
    if (visited.has(itemId)) return;
    const item = byId.get(itemId);
    if (!item) return;
    visiting.add(itemId);
    const composedIds = [
      ...item.composedItems,
      ...item.variants.flatMap((variant) => variant.composedItems ?? []),
    ];
    for (const composedId of composedIds) findCycle(composedId);
    visiting.delete(itemId);
    visited.add(itemId);
  };
  for (const item of items) findCycle(item.id);

  return { valid: issues.length === 0, issues };
}

export function assertValidLibraryCatalog(items: readonly LibraryItem[]): void {
  const result = validateLibraryCatalog(items);
  if (!result.valid) {
    const detail = result.issues.map((issue) => issue.message).join("\n");
    throw new Error(`Invalid MDS Library catalog:\n${detail}`);
  }
}
