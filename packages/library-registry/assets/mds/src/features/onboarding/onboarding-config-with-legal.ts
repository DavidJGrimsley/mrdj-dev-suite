import type { Href } from 'expo-router';

export type OnboardingCompletionMode = 'enter-app' | 'auth' | 'account-setup' | 'custom';

export interface OnboardingValueProp {
  title: string;
  body: string;
}

export interface OnboardingFeatureHighlight {
  id: string;
  title: string;
  body: string;
  badge?: string;
}

export interface OnboardingCompletionConfig {
  mode: OnboardingCompletionMode;
  route: Href;
  label: string;
  helperText: string;
}

export interface OnboardingConfig {
  appName: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeBody: string;
  valueProps: OnboardingValueProp[];
  nextRouteAfterWelcome: Href;
  featuresEyebrow: string;
  featuresTitle: string;
  featuresBody: string;
  featureHighlights: OnboardingFeatureHighlight[];
  nextRouteAfterFeatures: Href;
  legal: {
    title: string;
    body: string;
  };
  completeTitle: string;
  completeBody: string;
  completion: OnboardingCompletionConfig;
}

export const onboardingConfig: OnboardingConfig = {
  appName: '__MDS_APP_NAME__',
  welcomeEyebrow: 'Welcome',
  welcomeTitle: 'A quick tour before you begin',
  welcomeBody:
    'See the core workflow, review what the app can do, and continue when you are ready.',
  valueProps: [
    {
      title: 'Start with the main job',
      body: 'The first screen should explain the app in plain customer-facing language.',
    },
    {
      title: 'Show real value',
      body: 'Use the second screen to highlight features, integrations, or product moments that matter.',
    },
    {
      title: 'Hand off cleanly',
      body: 'The final action is editable for app entry, auth, account setup, or a custom route.',
    },
  ],
  nextRouteAfterWelcome: '/onboarding/features' as Href,
  featuresEyebrow: 'Features',
  featuresTitle: 'What you can do next',
  featuresBody:
    'These highlights are informational by default, so users are not asked to make choices before those choices affect the app.',
  featureHighlights: [
    {
      id: 'workflow',
      title: 'Follow the core workflow',
      body: 'Explain the shortest path from the user arriving to getting meaningful work done.',
      badge: 'Core',
    },
    {
      id: 'integrations',
      title: 'Introduce optional integrations',
      body: 'Mention connected services only when they expand the product value without blocking setup.',
      badge: 'Optional',
    },
    {
      id: 'control',
      title: 'Keep the user in control',
      body: 'Avoid collecting preferences until the app stores them or changes behavior from them.',
      badge: 'Simple',
    },
  ],
  nextRouteAfterFeatures: '/onboarding/legal' as Href,
  legal: {
    title: 'Review legal documents',
    body: 'Review the Terms of Service and Privacy Policy before continuing.',
  },
  completeTitle: 'You are ready to begin',
  completeBody:
    'Continue into the next step of the app. Wire this final action to auth, account setup, or the main product route.',
  completion: {
    mode: 'enter-app',
    route: '/' as Href,
    label: "Let's begin",
    helperText: 'Persist or replace this choice when real onboarding state is ready.',
  },
};
