import path from 'node:path';

import {
  getLibraryItem,
  listLibraryItems,
  readLibraryAsset,
  resolveLibraryItem,
} from '@mr.dj2u/library-registry';

import type {
  LibraryProjectContext,
  LibraryResolvedAsset,
  LibraryResolutionIssue,
} from '@mr.dj2u/library-registry';

const CONTENT_TOKEN_VALUES = {
  __MDS_APP_NAME__: (context: LibraryProjectContext) => context.projectName,
  __MDS_LEGAL_BUSINESS_NAME__: (context: LibraryProjectContext) =>
    context.legalBusinessName ?? 'TODO_REPLACE_WITH_LEGAL_BUSINESS_NAME',
  __MDS_LEGAL_CONTACT_EMAIL__: (context: LibraryProjectContext) =>
    context.legalContactEmail ?? 'TODO_REPLACE_WITH_PRIVACY_CONTACT_EMAIL',
  __MDS_LEGAL_ADDRESS_OR_REGION_NOTE__: (context: LibraryProjectContext) =>
    context.legalAddressOrRegionNote ?? 'TODO_REPLACE_WITH_BUSINESS_ADDRESS_OR_REGION_NOTE',
} satisfies Record<string, (context: LibraryProjectContext) => string | undefined>;

function normalizeProjectPath(filePath: string): string {
  return filePath.split(path.sep).join('/').replace(/^\.\//, '');
}

export async function loadLibraryTextAssets(
  itemId: string,
  context: LibraryProjectContext,
  variant?: string
): Promise<Map<string, string>> {
  const resolution = resolveLibraryItem(itemId, context, { variant });
  if (!resolution.compatible) {
    const details = resolution.issues
      .filter((issue: LibraryResolutionIssue) => issue.severity === 'error')
      .map((issue: LibraryResolutionIssue) => issue.message)
      .join('; ');
    throw new Error(`MDS Library item ${itemId} is not compatible with generated project: ${details}`);
  }

  const assets = new Map<string, string>();
  for (const asset of resolution.assets) {
    if (asset.encoding !== 'utf8') {
      continue;
    }
    const contents = await readLibraryAsset(asset);
    let rendered = contents.toString('utf8');
    for (const token of asset.contentTokens ?? []) {
      const readValue = CONTENT_TOKEN_VALUES[token];
      if (!readValue) {
        throw new Error(`MDS Library asset ${asset.destination} uses unsupported token ${token}.`);
      }
      const value = readValue(context)?.trim();
      if (!value) {
        throw new Error(`MDS Library asset ${asset.destination} requires a value for ${token}.`);
      }
      rendered = rendered.split(token).join(value);
    }
    assets.set(normalizeProjectPath(asset.destination), rendered);
  }
  return assets;
}

export function requireLibraryTextAsset(
  itemId: string,
  assets: ReadonlyMap<string, string>,
  destination: string
): string {
  const normalizedDestination = normalizeProjectPath(destination);
  const contents = assets.get(normalizedDestination);
  if (contents === undefined) {
    throw new Error(
      `MDS Library item ${itemId} does not provide required generated asset ${normalizedDestination}.`
    );
  }
  return contents;
}

export function findLibraryAssetByDestination(
  assets: readonly LibraryResolvedAsset[],
  destination: string
): LibraryResolvedAsset | undefined {
  const normalizedDestination = normalizeProjectPath(destination);
  return assets.find(
    (asset) => normalizeProjectPath(asset.destination) === normalizedDestination
  );
}

export function listLibraryDestinationsByTag(tag: string): string[] {
  const destinations = new Set<string>();
  for (const summary of listLibraryItems({ tags: [tag] })) {
    const item = getLibraryItem(summary.id);
    if (!item) {
      throw new Error(`MDS Library catalog references unknown item ${summary.id}.`);
    }
    for (const asset of item.assets) {
      destinations.add(normalizeProjectPath(asset.destination));
    }
    for (const variant of item.variants) {
      for (const asset of variant.assets ?? []) {
        destinations.add(normalizeProjectPath(asset.destination));
      }
    }
  }
  return [...destinations].sort();
}

export function listLibraryDestinationsForItems(itemIds: readonly string[]): string[] {
  const destinations = new Set<string>();
  const visited = new Set<string>();

  const visit = (itemId: string): void => {
    if (visited.has(itemId)) return;
    visited.add(itemId);
    const item = getLibraryItem(itemId);
    if (!item) {
      throw new Error(`MDS Library catalog references unknown item ${itemId}.`);
    }
    for (const asset of item.assets) {
      destinations.add(normalizeProjectPath(asset.destination));
    }
    for (const variant of item.variants) {
      for (const asset of variant.assets ?? []) {
        destinations.add(normalizeProjectPath(asset.destination));
      }
      for (const composedId of variant.composedItems ?? []) {
        visit(composedId);
      }
    }
    for (const composedId of item.composedItems) {
      visit(composedId);
    }
  };

  for (const itemId of itemIds) visit(itemId);
  return [...destinations].sort();
}
