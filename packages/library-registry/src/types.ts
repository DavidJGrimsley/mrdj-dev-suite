export type LibraryItemKind =
  | "component"
  | "animation"
  | "screen"
  | "flow"
  | "integration";

export type LibrarySourceName =
  | "mds"
  | "create-expo-app"
  | "create-expo-stack"
  | "nativewindui"
  | "swmansion";

export type LibraryPlatform = "android" | "ios" | "web";

export type LibraryStyling =
  | "stylesheet"
  | "nativewind"
  | "nativewindui"
  | "uniwind"
  | "tamagui"
  | "restyle";

export type LibraryNavigation = "expo-router" | "react-navigation";

export type LibraryNavigationLayout = "stack" | "tabs" | "drawer+tabs";

export type LibraryAppDirectory = "app" | "src/app" | "root" | "src";

export type LibraryDependencyKind = "runtime" | "development";

export type LibraryDependencyInstaller = "expo" | "package-manager";

export type LibraryAssetEncoding = "utf8" | "binary";

export type LibraryAssetRole = "source" | "route" | "support" | "static";

export type LibraryContentToken =
  | "__MDS_APP_NAME__"
  | "__MDS_LEGAL_BUSINESS_NAME__"
  | "__MDS_LEGAL_CONTACT_EMAIL__"
  | "__MDS_LEGAL_ADDRESS_OR_REGION_NOTE__";

export interface LibrarySource {
  name: LibrarySourceName;
  displayName: string;
  version: string;
  license: "MIT";
  repository: string;
  sourcePath?: string;
}

export interface LibraryExpoSdkCompatibility {
  min?: number;
  max?: number;
}

export interface LibraryCompatibility {
  expoSdk?: LibraryExpoSdkCompatibility;
  styling?: readonly LibraryStyling[];
  navigation?: readonly LibraryNavigation[];
  navigationLayout?: readonly LibraryNavigationLayout[];
  platforms?: readonly LibraryPlatform[];
  appDirectory?: readonly ("app" | "src/app")[];
  aliases?: readonly string[];
}

export interface LibraryDependency {
  name: string;
  version: string;
  kind: LibraryDependencyKind;
  installer: LibraryDependencyInstaller;
  platforms?: readonly LibraryPlatform[];
}

export interface LibraryAsset {
  /** Package-relative path. Registry assets always live below `assets/`. */
  path: string;
  /** Project-relative path; supported tokens are documented by `LibraryProjectContext`. */
  destination: string;
  encoding: LibraryAssetEncoding;
  role?: LibraryAssetRole;
  /** Explicit content placeholders; callers replace these only when project context supplies a value. */
  contentTokens?: readonly LibraryContentToken[];
}

export interface LibraryVariant {
  id: string;
  name: string;
  description?: string;
  compatibility?: LibraryCompatibility;
  dependencies?: readonly LibraryDependency[];
  composedItems?: readonly string[];
  assets?: readonly LibraryAsset[];
  integration?: readonly string[];
}

export interface LibraryIntegration {
  summary: string;
  instructions: readonly string[];
  notes?: readonly string[];
}

export interface LibraryPreview {
  description?: string;
  assetPath?: string;
  alt?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  kind: LibraryItemKind;
  source: LibrarySource;
  tags: readonly string[];
  categories: readonly string[];
  delivery: "source-copy";
  compatibility: LibraryCompatibility;
  dependencies: readonly LibraryDependency[];
  composedItems: readonly string[];
  relatedItems: readonly string[];
  variants: readonly LibraryVariant[];
  assets: readonly LibraryAsset[];
  integration: LibraryIntegration;
  preview?: LibraryPreview;
}

export interface LibraryItemSummary {
  id: string;
  name: string;
  description: string;
  kind: LibraryItemKind;
  source: LibrarySource;
  tags: readonly string[];
  categories: readonly string[];
  compatibility: LibraryCompatibility;
  variants: readonly Pick<LibraryVariant, "id" | "name" | "description">[];
}

export interface LibraryProjectContext {
  projectName?: string;
  legalBusinessName?: string;
  legalContactEmail?: string;
  legalAddressOrRegionNote?: string;
  /** Expo SDK version such as `56`, `56.0.11`, `~56.0.11`, or `^56.0.11`. */
  expoSdk?: string | number;
  styling?: LibraryStyling;
  /** Both discovered directory paths and MDS's legacy location labels are accepted. */
  appDirectory?: LibraryAppDirectory;
  navigation?: LibraryNavigation;
  navigationLayout?: LibraryNavigationLayout;
  platforms?: readonly LibraryPlatform[];
  aliases?: Readonly<Record<string, string>>;
  dependencies?: Readonly<Record<string, string>>;
  /** Existing project-relative file paths. Used to surface preflight warnings. */
  files?: readonly string[];
  /** Defaults to `src/components`. Must be a safe project-relative path. */
  componentsDirectory?: string;
  /** Defaults to `src/features`. Must be a safe project-relative path. */
  featuresDirectory?: string;
}

export interface LibraryFilter {
  kind?: LibraryItemKind | readonly LibraryItemKind[];
  source?: LibrarySourceName | readonly LibrarySourceName[];
  tags?: readonly string[];
  categories?: readonly string[];
  compatibleWith?: LibraryProjectContext;
}

export interface LibraryResolveOptions {
  variant?: string;
}

export type LibraryResolutionIssueSeverity = "info" | "warning" | "error";

export type LibraryResolutionIssueCode =
  | "unknown-item"
  | "unknown-variant"
  | "unsupported-expo-sdk"
  | "unsupported-styling"
  | "unsupported-navigation"
  | "unsupported-navigation-layout"
  | "unsupported-platform"
  | "unsupported-app-directory"
  | "missing-alias"
  | "missing-dependency"
  | "dependency-version-conflict"
  | "destination-collision"
  | "destination-exists"
  | "unsafe-destination";

export interface LibraryResolutionIssue {
  code: LibraryResolutionIssueCode;
  severity: LibraryResolutionIssueSeverity;
  message: string;
  itemId: string;
  path?: string;
  dependency?: string;
}

export interface LibraryResolvedItem {
  id: string;
  variantId?: string;
}

export interface LibraryResolvedAsset extends LibraryAsset {
  itemId: string;
  variantId?: string;
  /** Fully rendered, safe project-relative destination path. */
  destination: string;
}

export interface LibraryResolution {
  item: LibraryItem;
  variant?: LibraryVariant;
  compatible: boolean;
  issues: LibraryResolutionIssue[];
  /** Dependency-first, de-duplicated composition order. */
  items: LibraryResolvedItem[];
  assets: LibraryResolvedAsset[];
  dependencies: LibraryDependency[];
  integration: string[];
}

export interface LibraryCatalogValidationIssue {
  code:
    | "duplicate-id"
    | "invalid-id"
    | "invalid-asset-path"
    | "missing-asset"
    | "invalid-destination"
    | "unknown-composed-item"
    | "unknown-related-item"
    | "composition-cycle"
    | "duplicate-variant"
    | "invalid-variant-id"
    | "invalid-license"
    | "invalid-source"
    | "invalid-dependency";
  message: string;
  itemId?: string;
  path?: string;
}

export interface LibraryCatalogValidationResult {
  valid: boolean;
  issues: LibraryCatalogValidationIssue[];
}
