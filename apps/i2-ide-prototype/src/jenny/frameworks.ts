import type { FrameworkId, FrameworkOption } from "./types.ts";

export const FRAMEWORK_REGISTRY: Record<FrameworkId, FrameworkOption> = {
  exact: {
    id: "exact",
    displayName: "Expo Exact",
    shortName: "Exact",
    actionText: "Generate new Exact project",
    description: "Native performance with Contract UI and Rust/TypeScript data logic.",
    defaultTemplate: "blank",
    availableTemplates: ["blank", "chat", "landscapes", "softwear"],
    supportedPlatforms: ["Web", "macOS", "Desktop", "iOS (Experimental)", "Android (Experimental)"],
    uiLanguage: "Contract",
    dataLogic: "TypeScript / Rust",
    maturity: "preview",
    officialDocsUrl: "https://github.com/expo/exact",
    sourceRepoUrl: "https://github.com/expo/exact-templates",
  },
  "expo-react-native": {
    id: "expo-react-native",
    displayName: "Expo React Native",
    shortName: "Expo",
    actionText: "Generate new Expo project",
    description: "Production mobile & web with Expo Router, React Native, and Supabase.",
    defaultTemplate: "tabs",
    availableTemplates: ["tabs", "blank", "drawer", "stack"],
    supportedPlatforms: ["iOS", "Android", "Web"],
    uiLanguage: "React Native / TypeScript",
    dataLogic: "TypeScript / React Hooks",
    maturity: "stable",
    officialDocsUrl: "https://docs.expo.dev",
    sourceRepoUrl: "https://github.com/expo/expo",
  },
};

export const SUPPORTED_FRAMEWORKS: FrameworkOption[] = [
  FRAMEWORK_REGISTRY.exact,
  FRAMEWORK_REGISTRY["expo-react-native"],
];

export const DEFAULT_FRAMEWORK: FrameworkId = "exact";

export function getFramework(id: FrameworkId): FrameworkOption {
  return FRAMEWORK_REGISTRY[id] ?? FRAMEWORK_REGISTRY.exact;
}

export function isValidFrameworkId(id: string): id is FrameworkId {
  return id === "exact" || id === "expo-react-native";
}
