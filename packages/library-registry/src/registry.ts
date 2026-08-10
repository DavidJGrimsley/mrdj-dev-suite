import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { libraryCatalog } from "./catalog.js";
import type {
  LibraryAsset,
  LibraryCompatibility,
  LibraryDependency,
  LibraryFilter,
  LibraryItem,
  LibraryItemSummary,
  LibraryProjectContext,
  LibraryResolution,
  LibraryResolutionIssue,
  LibraryResolveOptions,
  LibraryResolvedAsset,
  LibrarySourceName,
  LibraryVariant,
} from "./types.js";
import {
  assertValidLibraryCatalog,
  isSafeLibraryAssetPath,
  isSafeLibraryDestination,
} from "./validation.js";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ASSET_ROOT = path.join(PACKAGE_ROOT, "assets");
const catalogById = new Map(libraryCatalog.map((item) => [item.id, item]));

assertValidLibraryCatalog(libraryCatalog);

function asArray<T>(
  value: T | readonly T[] | undefined,
): readonly T[] | undefined {
  return value === undefined
    ? undefined
    : Array.isArray(value)
      ? value
      : [value as T];
}

function toSummary(item: LibraryItem): LibraryItemSummary {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    kind: item.kind,
    source: item.source,
    tags: item.tags,
    categories: item.categories,
    compatibility: item.compatibility,
    variants: item.variants.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  };
}

function matchesFilter(item: LibraryItem, filter: LibraryFilter): boolean {
  const kinds = asArray(filter.kind);
  if (kinds && !kinds.includes(item.kind)) return false;
  const sources = asArray<LibrarySourceName>(filter.source);
  if (sources && !sources.includes(item.source.name)) return false;
  if (filter.tags && !filter.tags.every((tag) => item.tags.includes(tag)))
    return false;
  if (
    filter.categories &&
    !filter.categories.every((category) => item.categories.includes(category))
  ) {
    return false;
  }
  if (
    filter.compatibleWith &&
    !resolveLibraryItem(item.id, filter.compatibleWith).compatible
  ) {
    return false;
  }
  return true;
}

export function listLibraryItems(
  filter: LibraryFilter = {},
): LibraryItemSummary[] {
  return libraryCatalog
    .filter((item) => matchesFilter(item, filter))
    .map(toSummary)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function searchScore(item: LibraryItem, query: string): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 1;
  const terms = normalized.split(/\s+/).filter(Boolean);
  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  const description = item.description.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  const categories = item.categories.join(" ").toLowerCase();
  const source = `${item.source.name} ${item.source.displayName}`.toLowerCase();
  const haystack = `${id} ${name} ${description} ${tags} ${categories} ${source}`;
  if (!terms.every((term) => haystack.includes(term))) return 0;

  let score = 0;
  if (id === normalized) score += 100;
  if (name === normalized) score += 80;
  if (id.startsWith(normalized)) score += 50;
  if (name.startsWith(normalized)) score += 40;
  for (const term of terms) {
    if (id.includes(term)) score += 12;
    if (name.includes(term)) score += 10;
    if (tags.includes(term)) score += 6;
    if (categories.includes(term)) score += 4;
    if (description.includes(term)) score += 2;
    if (source.includes(term)) score += 1;
  }
  return score;
}

export function searchLibraryItems(
  query: string,
  filter: LibraryFilter = {},
): LibraryItemSummary[] {
  return libraryCatalog
    .filter((item) => matchesFilter(item, filter))
    .map((item) => ({ item, score: searchScore(item, query) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.item.id.localeCompare(right.item.id),
    )
    .map(({ item }) => toSummary(item));
}

export function getLibraryItem(id: string): LibraryItem | undefined {
  return catalogById.get(id);
}

function parseExpoSdk(value: string | number | undefined): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  if (!value) return undefined;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function normalizedAppDirectory(
  value: LibraryProjectContext["appDirectory"],
): "app" | "src/app" | undefined {
  if (value === "root") return "app";
  if (value === "src") return "src/app";
  return value;
}

function compatibilityIssues(
  itemId: string,
  compatibility: LibraryCompatibility,
  context: LibraryProjectContext,
): LibraryResolutionIssue[] {
  const issues: LibraryResolutionIssue[] = [];
  const sdk = parseExpoSdk(context.expoSdk);
  if (sdk !== undefined && compatibility.expoSdk) {
    const { min, max } = compatibility.expoSdk;
    if ((min !== undefined && sdk < min) || (max !== undefined && sdk > max)) {
      issues.push({
        code: "unsupported-expo-sdk",
        severity: "error",
        itemId,
        message: `${itemId} does not support Expo SDK ${sdk}.`,
      });
    }
  }
  if (
    context.styling &&
    compatibility.styling &&
    !compatibility.styling.includes(context.styling)
  ) {
    issues.push({
      code: "unsupported-styling",
      severity: "error",
      itemId,
      message: `${itemId} does not support ${context.styling} styling.`,
    });
  }
  if (
    context.navigation &&
    compatibility.navigation &&
    !compatibility.navigation.includes(context.navigation)
  ) {
    issues.push({
      code: "unsupported-navigation",
      severity: "error",
      itemId,
      message: `${itemId} does not support ${context.navigation}.`,
    });
  }
  if (
    context.navigationLayout &&
    compatibility.navigationLayout &&
    !compatibility.navigationLayout.includes(context.navigationLayout)
  ) {
    issues.push({
      code: "unsupported-navigation-layout",
      severity: "error",
      itemId,
      message: `${itemId} does not support the ${context.navigationLayout} navigation layout.`,
    });
  }
  if (context.platforms && compatibility.platforms) {
    for (const platform of context.platforms) {
      if (!compatibility.platforms.includes(platform)) {
        issues.push({
          code: "unsupported-platform",
          severity: "error",
          itemId,
          message: `${itemId} does not support ${platform}.`,
        });
      }
    }
  }
  const appDirectory = normalizedAppDirectory(context.appDirectory);
  if (
    appDirectory &&
    compatibility.appDirectory &&
    !compatibility.appDirectory.includes(appDirectory)
  ) {
    issues.push({
      code: "unsupported-app-directory",
      severity: "error",
      itemId,
      message: `${itemId} does not support routes below ${appDirectory}.`,
    });
  }
  if (context.aliases && compatibility.aliases) {
    for (const alias of compatibility.aliases) {
      if (!(alias in context.aliases)) {
        issues.push({
          code: "missing-alias",
          severity: "error",
          itemId,
          message: `${itemId} requires the ${alias} path alias.`,
        });
      }
    }
  }
  return issues;
}

function variantSelectionScore(
  variant: LibraryVariant,
  context: LibraryProjectContext,
): number {
  const compatibility = variant.compatibility;
  if (!compatibility) return 0;
  if (
    compatibilityIssues("variant", compatibility, context).some(
      (issue) => issue.severity === "error",
    )
  ) {
    return -1;
  }
  let score = 0;
  if (
    context.navigation &&
    compatibility.navigation?.includes(context.navigation)
  )
    score += 4;
  if (
    context.navigationLayout &&
    compatibility.navigationLayout?.includes(context.navigationLayout)
  ) {
    score += 4;
  }
  if (context.styling && compatibility.styling?.includes(context.styling))
    score += 2;
  const appDirectory = normalizedAppDirectory(context.appDirectory);
  if (appDirectory && compatibility.appDirectory?.includes(appDirectory))
    score += 1;
  return score;
}

function selectVariant(
  item: LibraryItem,
  context: LibraryProjectContext,
  requestedVariant?: string,
): LibraryVariant | undefined {
  if (requestedVariant)
    return item.variants.find((variant) => variant.id === requestedVariant);
  let selected: LibraryVariant | undefined;
  let selectedScore = 0;
  for (const variant of item.variants) {
    const score = variantSelectionScore(variant, context);
    if (score > selectedScore) {
      selected = variant;
      selectedScore = score;
    }
  }
  return selected;
}

function safeContextDirectory(value: string): boolean {
  return isSafeLibraryDestination(value) && !value.includes("{{");
}

function resolveDestination(
  destination: string,
  context: LibraryProjectContext,
): string | undefined {
  const appDir = normalizedAppDirectory(context.appDirectory) ?? "src/app";
  const componentsDir = context.componentsDirectory ?? "src/components";
  const featuresDir = context.featuresDirectory ?? "src/features";
  if (![appDir, componentsDir, featuresDir].every(safeContextDirectory))
    return undefined;
  const rendered = destination
    .split("{{appDir}}")
    .join(appDir)
    .split("{{componentsDir}}")
    .join(componentsDir)
    .split("{{featuresDir}}")
    .join(featuresDir);
  return isSafeLibraryDestination(rendered)
    ? path.posix.normalize(rendered)
    : undefined;
}

function parseVersion(value: string): [number, number, number] | undefined {
  const match = value.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match?.[1]) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function satisfiesDependencyVersion(
  installed: string,
  required: string,
): boolean {
  if (
    required === "latest" ||
    installed === "latest" ||
    installed.startsWith("workspace:")
  )
    return true;
  const actual = parseVersion(installed);
  const expected = parseVersion(required);
  if (!actual || !expected) return installed === required;
  const atLeastExpected =
    actual[0] > expected[0] ||
    (actual[0] === expected[0] && actual[1] > expected[1]) ||
    (actual[0] === expected[0] &&
      actual[1] === expected[1] &&
      actual[2] >= expected[2]);
  if (required.trim().startsWith("^")) {
    if (!atLeastExpected || actual[0] !== expected[0]) return false;
    if (expected[0] === 0 && actual[1] !== expected[1]) return false;
    if (expected[0] === 0 && expected[1] === 0 && actual[2] !== expected[2])
      return false;
    return true;
  }
  if (required.trim().startsWith("~")) {
    return (
      actual[0] === expected[0] && actual[1] === expected[1] && atLeastExpected
    );
  }
  return (
    actual[0] === expected[0] &&
    actual[1] === expected[1] &&
    actual[2] === expected[2]
  );
}

function dependencyApplies(
  dependency: LibraryDependency,
  context: LibraryProjectContext,
): boolean {
  if (!dependency.platforms || !context.platforms) return true;
  return context.platforms.some((platform) =>
    dependency.platforms?.includes(platform),
  );
}

export function resolveLibraryItem(
  id: string,
  context: LibraryProjectContext = {},
  options: LibraryResolveOptions = {},
): LibraryResolution {
  const rootItem = catalogById.get(id);
  if (!rootItem) throw new Error(`Unknown library item: ${id}`);
  const requestedVariant = options.variant;
  const rootVariant = selectVariant(rootItem, context, requestedVariant);
  const issues: LibraryResolutionIssue[] = [];
  if (requestedVariant && !rootVariant) {
    issues.push({
      code: "unknown-variant",
      severity: "error",
      itemId: rootItem.id,
      message: `${rootItem.id} has no ${requestedVariant} variant.`,
    });
  }

  const items: LibraryResolution["items"] = [];
  const assets: LibraryResolvedAsset[] = [];
  const dependencies: LibraryDependency[] = [];
  const integration: string[] = [];
  const visited = new Set<string>();
  const assetByDestination = new Map<string, LibraryResolvedAsset>();
  const dependencyByName = new Map<string, LibraryDependency>();
  const existingFiles = new Set(
    (context.files ?? []).map((file) => file.split("\\").join("/")),
  );

  const visit = (item: LibraryItem, forcedVariant?: LibraryVariant): void => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const selectedVariant = forcedVariant ?? selectVariant(item, context);
    issues.push(...compatibilityIssues(item.id, item.compatibility, context));
    if (selectedVariant?.compatibility) {
      issues.push(
        ...compatibilityIssues(item.id, selectedVariant.compatibility, context),
      );
    }
    const composedItems = [
      ...item.composedItems,
      ...(selectedVariant?.composedItems ?? []),
    ];
    for (const composedId of composedItems) {
      const composedItem = catalogById.get(composedId);
      if (!composedItem) {
        issues.push({
          code: "unknown-item",
          severity: "error",
          itemId: item.id,
          message: `${item.id} composes missing item ${composedId}.`,
        });
        continue;
      }
      visit(composedItem);
    }

    const selectedDependencies = [
      ...item.dependencies,
      ...(selectedVariant?.dependencies ?? []),
    ].filter((dependency) => dependencyApplies(dependency, context));
    for (const dependency of selectedDependencies) {
      const prior = dependencyByName.get(dependency.name);
      if (
        prior &&
        (prior.version !== dependency.version || prior.kind !== dependency.kind)
      ) {
        issues.push({
          code: "dependency-version-conflict",
          severity: "error",
          itemId: item.id,
          dependency: dependency.name,
          message: `${dependency.name} is required as both ${prior.version} and ${dependency.version}.`,
        });
      } else if (!prior) {
        dependencyByName.set(dependency.name, dependency);
        dependencies.push(dependency);
      }
      const installed = context.dependencies?.[dependency.name];
      if (!installed) {
        issues.push({
          code: "missing-dependency",
          severity: "info",
          itemId: item.id,
          dependency: dependency.name,
          message: `${dependency.name}@${dependency.version} must be installed.`,
        });
      } else if (!satisfiesDependencyVersion(installed, dependency.version)) {
        issues.push({
          code: "dependency-version-conflict",
          severity: "error",
          itemId: item.id,
          dependency: dependency.name,
          message: `${item.id} requires ${dependency.name}@${dependency.version}, but the project declares ${installed}.`,
        });
      }
    }

    for (const value of [...item.assets, ...(selectedVariant?.assets ?? [])]) {
      const destination = resolveDestination(value.destination, context);
      if (!destination) {
        issues.push({
          code: "unsafe-destination",
          severity: "error",
          itemId: item.id,
          path: value.destination,
          message: `Could not render a safe destination for ${value.destination}.`,
        });
        continue;
      }
      const resolved: LibraryResolvedAsset = {
        ...value,
        itemId: item.id,
        ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
        destination,
      };
      const prior = assetByDestination.get(destination);
      if (prior && prior.path !== resolved.path) {
        issues.push({
          code: "destination-collision",
          severity: "error",
          itemId: item.id,
          path: destination,
          message: `${prior.itemId} and ${item.id} both target ${destination}.`,
        });
        continue;
      }
      if (!prior) {
        assetByDestination.set(destination, resolved);
        assets.push(resolved);
        if (existingFiles.has(destination)) {
          issues.push({
            code: "destination-exists",
            severity: "warning",
            itemId: item.id,
            path: destination,
            message: `${destination} already exists and requires content preflight.`,
          });
        }
      }
    }

    integration.push(
      item.integration.summary,
      ...item.integration.instructions,
    );
    if (item.integration.notes) integration.push(...item.integration.notes);
    if (selectedVariant?.integration)
      integration.push(...selectedVariant.integration);
    items.push({
      id: item.id,
      ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
    });
  };

  visit(rootItem, rootVariant);
  return {
    item: rootItem,
    ...(rootVariant ? { variant: rootVariant } : {}),
    compatible: !issues.some((issue) => issue.severity === "error"),
    issues,
    items,
    assets,
    dependencies,
    integration: Array.from(new Set(integration)),
  };
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export async function readLibraryAsset(
  assetOrPath: LibraryAsset | string,
): Promise<Buffer> {
  const assetPath =
    typeof assetOrPath === "string" ? assetOrPath : assetOrPath.path;
  if (!isSafeLibraryAssetPath(assetPath)) {
    throw new Error(`Unsafe library asset path: ${assetPath}`);
  }
  const candidate = path.resolve(PACKAGE_ROOT, assetPath);
  if (!isWithin(ASSET_ROOT, candidate)) {
    throw new Error(
      `Library asset escapes the package asset root: ${assetPath}`,
    );
  }
  const [realAssetRoot, realCandidate] = await Promise.all([
    realpath(ASSET_ROOT),
    realpath(candidate),
  ]);
  if (!isWithin(realAssetRoot, realCandidate)) {
    throw new Error(
      `Library asset resolves outside the package asset root: ${assetPath}`,
    );
  }
  return readFile(realCandidate);
}
