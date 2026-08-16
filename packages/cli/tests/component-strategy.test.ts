import { describe, expect, it } from 'vitest';

import {
  PHASE0_COMPONENT_STRATEGY_TODO,
  buildComponentStrategy,
  detectComponentStrategyConflicts,
  formatComponentStrategySummary,
  isComponentStrategyResolved,
  parseComponentStrategy,
  renderComponentStrategySection,
  resolveComponentStrategyForRender,
} from '../src/component-strategy.js';
import { componentStrategyFromAnswers, renderInfo, renderTodo } from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

function sampleAnswers(
  overrides: Partial<OnboardAnswers> = {}
): OnboardAnswers {
  return {
    appName: 'Strategy App',
    audience: 'Expo app users',
    coreFlows: 'Onboarding, primary app workflow, settings',
    screens: 'Home, onboarding, settings',
    dataNeeds: 'Local state first',
    deploymentTarget: 'Expo web/native deployment',
    advancedPackageSetup: true,
    includeCreateExpoComponents: false,
    targetPlatforms: ['ios', 'android'],
    firstTargetPlatform: 'ios',
    platformFileStrategy: 'files-only',
    webOutput: 'none',
    deployedServer: 'none',
    expoServerAdapter: 'none',
    customBackend: false,
    customBackendEntry: 'server.js',
    usesExpoUi: true,
    usesExpoUiUniversalComponents: true,
    usesExpoNativeTabs: true,
    easUses: [],
    projectInfoReady: false,
    projectStyleReady: false,
    appDirectory: 'src',
    platformLayoutMode: 'shared',
    dataStart: 'local',
    onboardingFlow: 'none',
    legalDocumentMode: 'none',
    onboardingCompletionMode: 'enter-app',
    legalUpdateGate: 'none',
    testToMainSafeguards: false,
    defaults: ['project-docs', 'guidelines', 'doctor'],
    generatorStylingSystem: 'uniwind',
    ...overrides,
  };
}

describe('component strategy record', () => {
  it('detects Expo UI Universal and Native Tabs conflicts for a CSS utility system', () => {
    const strategy = buildComponentStrategy({
      stylingSystem: 'uniwind',
      usesExpoUi: true,
      usesExpoUiUniversalComponents: true,
      usesExpoNativeTabs: true,
    });

    expect(strategy.decision).toBe('pending');
    expect(strategy.conflicts.map((conflict) => conflict.code)).toEqual([
      'styling-system-and-expo-ui-universal',
      'styling-system-and-native-tabs',
    ]);
    expect(strategy.conflicts[0]?.severity).toBe('warning');
    expect(strategy.conflicts[1]?.severity).toBe('info');
  });

  it('records a milder Expo UI conflict when Universal components are off', () => {
    const conflicts = detectComponentStrategyConflicts({
      stylingSystem: 'tamagui',
      usesExpoUi: true,
      usesExpoUiUniversalComponents: false,
      usesExpoNativeTabs: false,
    });

    expect(conflicts).toEqual([
      expect.objectContaining({
        code: 'styling-system-and-expo-ui',
        severity: 'info',
      }),
    ]);
  });

  it('records no conflicts for StyleSheet without Expo UI primitives', () => {
    const strategy = buildComponentStrategy({
      stylingSystem: 'stylesheet',
      usesExpoUi: false,
      usesExpoUiUniversalComponents: false,
      usesExpoNativeTabs: false,
    });

    expect(strategy.conflicts).toEqual([]);
    expect(formatComponentStrategySummary(strategy)).toContain('no style-library conflicts');
  });

  it('round-trips the persisted markdown shape including conflict codes', () => {
    const strategy = buildComponentStrategy({
      stylingSystem: 'nativewind',
      usesExpoUi: true,
      usesExpoUiUniversalComponents: true,
      usesExpoNativeTabs: true,
      decision: 'pending',
    });
    const rendered = renderComponentStrategySection(strategy);
    const parsed = parseComponentStrategy(`# App Info\n\n${rendered}`);

    expect(parsed).toEqual(strategy);
    expect(rendered).toContain('## Component Strategy');
    expect(rendered).toContain('- Style Library: NativeWind');
    expect(rendered).toContain('- Decision: pending');
    expect(rendered).toContain('styling-system-and-expo-ui-universal (warning):');
  });

  it('preserves a confirmed decision when the selected combination has not changed', () => {
    const existing = renderComponentStrategySection(
      buildComponentStrategy({
        stylingSystem: 'stylesheet',
        usesExpoUi: false,
        usesExpoUiUniversalComponents: false,
        usesExpoNativeTabs: false,
        decision: 'confirmed',
      })
    );

    const next = resolveComponentStrategyForRender(
      {
        stylingSystem: 'stylesheet',
        usesExpoUi: false,
        usesExpoUiUniversalComponents: false,
        usesExpoNativeTabs: false,
      },
      existing
    );

    expect(next.decision).toBe('confirmed');
    expect(isComponentStrategyResolved(next)).toBe(true);
  });

  it('resets Decision to pending when the selected combination changes', () => {
    const existing = renderComponentStrategySection(
      buildComponentStrategy({
        stylingSystem: 'stylesheet',
        usesExpoUi: false,
        usesExpoUiUniversalComponents: false,
        usesExpoNativeTabs: false,
        decision: 'confirmed',
      })
    );

    const next = resolveComponentStrategyForRender(
      {
        stylingSystem: 'uniwind',
        usesExpoUi: true,
        usesExpoUiUniversalComponents: true,
        usesExpoNativeTabs: true,
      },
      existing
    );

    expect(next.decision).toBe('pending');
    expect(next.stylingSystem).toBe('uniwind');
  });

  it('writes the strategy section and Phase 0 gate into generated project memory', () => {
    const answers = sampleAnswers({ generatorStylingSystem: 'restyle' });
    const info = renderInfo('/tmp/strategy-app', answers);
    const todo = renderTodo(answers);
    const strategy = componentStrategyFromAnswers(answers);

    expect(info).toContain('## Component Strategy');
    expect(info).toContain('- Style Library: Restyle');
    expect(info).toContain('- Expo UI: Yes');
    expect(info).toContain('- Decision: pending');
    expect(info).toContain('styling-system-and-expo-ui-universal');
    expect(todo).toContain(`- [ ] ${PHASE0_COMPONENT_STRATEGY_TODO}`);
    expect(strategy.stylingSystem).toBe('restyle');
    expect(strategy.decision).toBe('pending');
  });

  it('honors an explicit confirmed decision from onboarding answers', () => {
    const answers = sampleAnswers({
      generatorStylingSystem: 'stylesheet',
      usesExpoUi: false,
      usesExpoUiUniversalComponents: false,
      usesExpoNativeTabs: false,
      componentStrategyDecision: 'confirmed',
    });

    expect(componentStrategyFromAnswers(answers).decision).toBe('confirmed');
    expect(renderInfo('/tmp/strategy-app', answers)).toContain('- Decision: confirmed');
  });
});
