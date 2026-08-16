import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  renderGeneratedOnboardingConfig,
  resolveGeneratorStylingSystem,
} from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const onboardingTemplateUrl = new URL(
  '../../library-registry/assets/mds/src/features/onboarding/onboarding-config.ts',
  import.meta.url
);

const answers: OnboardAnswers = {
  appName: 'Sample App',
  onboardingCompletionMode: 'auth',
} as OnboardAnswers;

function normalizeLineEndings(source: string, lineEnding: '\n' | '\r\n'): string {
  return source.replace(/\r?\n/gu, lineEnding);
}

function expectedCompletionBlock(lineEnding: '\n' | '\r\n'): string {
  const completion = {
    mode: 'auth',
    route: '/',
    label: 'Continue to app',
    helperText:
      'Auth handoff selected. Signed-out users are routed to sign in by the protected app layout.',
  };

  return [
    '  completion: {',
    `    mode: '${completion.mode}',`,
    `    route: '${completion.route}' as Href,`,
    `    label: ${JSON.stringify(completion.label)},`,
    `    helperText: ${JSON.stringify(completion.helperText)},`,
    '  },',
  ].join(lineEnding);
}

describe('renderGeneratedOnboardingConfig', () => {
  it.each([
    { name: 'LF', lineEnding: '\n' as const },
    { name: 'CRLF', lineEnding: '\r\n' as const },
  ])('rewrites the onboarding completion block for $name input', async ({ lineEnding }) => {
    const template = await readFile(onboardingTemplateUrl, 'utf8');
    const source = normalizeLineEndings(template, lineEnding);
    const rendered = renderGeneratedOnboardingConfig(source, answers);

    expect(rendered).toContain(expectedCompletionBlock(lineEnding));
    expect(rendered).toContain("mode: 'auth'");
    expect(rendered).not.toContain("mode: 'enter-app'");
    expect(rendered.includes('\r\n')).toBe(lineEnding === '\r\n');
  });
});

describe('resolveGeneratorStylingSystem', () => {
  it('prefers this run\'s generatorStylingSystem over stale defaults', () => {
    expect(
      resolveGeneratorStylingSystem({
        generatorStylingSystem: 'stylesheet',
        defaults: ['project-docs', 'uniwind', 'nativewindui'],
      })
    ).toBe('stylesheet');
  });

  it('falls back to a nativewindui default when the current run did not set a system', () => {
    expect(
      resolveGeneratorStylingSystem({
        defaults: ['project-docs', 'guidelines', 'nativewindui'],
      })
    ).toBe('nativewindui');
  });

  it('falls back to Uniwind when MDS is managing Uniwind and no system is selected', () => {
    expect(
      resolveGeneratorStylingSystem(
        { defaults: ['project-docs', 'guidelines', 'doctor'] },
        { manageUniwind: true }
      )
    ).toBe('uniwind');
  });

  it('returns stylesheet when nothing selected the current run as a styling library', () => {
    expect(
      resolveGeneratorStylingSystem({
        defaults: ['project-docs', 'guidelines', 'doctor'],
      })
    ).toBe('stylesheet');
  });
});
