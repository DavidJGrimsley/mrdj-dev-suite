import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DATA_START_EXPLANATION,
  DATA_NEED_OPTIONS,
  OTHER_DATA_NEEDS,
  PROJECT_INFO_EXPLANATION,
  SERVER_OUTPUT_EXPLANATION,
  SUPER_STACK_ONBOARDING_INTRO,
  SUPER_STACK_ONBOARDING_NOTE,
  SUPER_STACK_ONBOARDING_NOTE_TITLE,
  SUPER_STACK_SUCCESS_MESSAGE,
  TEST_TO_MAIN_EXPLANATION,
  defaultOnboardPlan,
  deriveDefaults,
  formatDataNeedsSelection,
  getServerPrompt,
  runOnboardCommand,
  validateRequiredInput,
} from '../src/commands/onboard.js';
import { scaffoldProjectMemory } from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runOnboardCommand', () => {
  it('creates project memory files in non-interactive mode', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'sample-app', scripts: {}, dependencies: {}, devDependencies: {} }),
      'utf8'
    );
    await mkdir(path.join(projectPath, 'app'), { recursive: true });

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Sample App',
      defaults: 'project-docs,uniwind,doctor',
    });

    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      'Sample App'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Monetization Strategy'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '# TodoForContext(optional): Add monetization notes'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Team Context'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Run `mrdj doctor --ci`'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'guidelines.md'), 'utf8')
    ).resolves.toContain('golden source of truth');
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      'Visual Direction'
    );
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      '## Motion Tone'
    );
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      '## Open Style Questions'
    );
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.not.toContain(
      'Keep Expo Router route files thin'
    );
    await expect(readFile(path.join(projectPath, 'AGENTS.md'), 'utf8')).resolves.toContain(
      'project/` folder is the source of truth'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'intake-agent.md'), 'utf8')
    ).resolves.toContain('Ask conversational follow-up questions');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('Rich boilerplate');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'), 'utf8')
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'style-guide-screen.tsx'), 'utf8')
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'), 'utf8')
    ).resolves.toContain('temporary developer and client-research scaffolds');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'style-guide-screen.tsx'), 'utf8')
    ).resolves.toContain('Style Guide');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Expo SQLite');
    await expect(readFile(path.join(projectPath, 'app', 'exposition', 'index.tsx'), 'utf8')).resolves.toContain(
      'exposition-screen'
    );
    await expect(readFile(path.join(projectPath, 'app', 'exposition', 'style-guide.tsx'), 'utf8')).resolves.toContain(
      'style-guide-screen'
    );
    await expect(readFile(path.join(projectPath, 'app', 'exposition', 'data.tsx'), 'utf8')).resolves.toContain(
      'data-screen'
    );
    await expect(readFile(path.join(projectPath, 'src', 'components', 'mrdj', 'index.ts'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(projectPath, 'src', 'components', 'exposition', 'index.ts'), 'utf8')).resolves.toContain(
      'AnimatedPressable'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Phase 0: Orientation And Planning'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Play with styling in the style-guide page'
    );
    await expect(readFile(path.join(projectPath, 'AGENTS.md'), 'utf8')).resolves.toContain(
      'build from `project/todo.md` in phase order'
    );
    await expect(readFile(path.join(projectPath, '.github', 'workflows', 'mrdj-pr-checks.yml'), 'utf8')).resolves.toContain(
      'MrDJ PR Checks'
    );
    await expect(readFile(path.join(projectPath, 'project', 'release-flow.md'), 'utf8')).resolves.toContain(
      'Test-To-Main Safeguards'
    );
    await expect(readFile(path.join(projectPath, 'package.json'), 'utf8')).resolves.toContain(
      'clear-expo-start'
    );

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.scripts['expo-install-fix']).toBe('npx expo install --fix');
    expect(packageJson.scripts['expo-doctor']).toBe('npx expo-doctor');
    expect(packageJson.scripts['post-create-check']).toBe('npx expo install --fix && npx expo-doctor');
    expect(packageJson.scripts['ci:verify']).toBe('npx @mrdj/cli doctor --ci');
    expect(packageJson.dependencies['expo-sqlite']).toBe('~55.0.15');
    expect(packageJson.dependencies.uniwind).toBe('^1.6.4');
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.2.4');
  });

  it('normalizes existing project info and style while preserving imported notes', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-existing-memory-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'memory-app' }), 'utf8');
    await writeFile(path.join(projectPath, 'project', 'info.md'), '# Old Notes\n\nUsers are bowling league captains.\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'style.md'), '# Style Dump\n\nUse loud tournament energy.\n', 'utf8');

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Memory App',
      audience: 'Bowling league captains',
      coreFlows: 'Create league, invite players, publish brackets',
      dataNeeds: 'Leagues, players, match results',
      deploymentTarget: 'Web first, mobile later',
      rich: false,
    });

    const info = await readFile(path.join(projectPath, 'project', 'info.md'), 'utf8');
    expect(info).toContain('## Target Users');
    expect(info).toContain('## Imported Notes');
    expect(info).toContain('Users are bowling league captains.');
    expect(info).toContain('## Monetization Strategy');

    const style = await readFile(path.join(projectPath, 'project', 'style.md'), 'utf8');
    expect(style).toContain('## Brand/References');
    expect(style).toContain('## Imported Notes');
    expect(style).toContain('Use loud tournament energy.');

    await expect(readFile(path.join(projectPath, 'project', 'intake-agent.md'), 'utf8')).resolves.toContain(
      'Imported Notes'
    );
  });

  it('upgrades existing Tailwind 3 projects to the Uniwind Tailwind 4 peer', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-tailwind-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'tailwind-app',
        scripts: {},
        dependencies: { nativewind: 'latest' },
        devDependencies: { tailwindcss: '^3.4.0', 'prettier-plugin-tailwindcss': '^0.5.11' },
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'metro.config.js'),
      [
        "const { getDefaultConfig } = require('expo/metro-config');",
        "const { withNativeWind } = require('nativewind/metro');",
        'const config = getDefaultConfig(__dirname);',
        "module.exports = withNativeWind(config, { input: './global.css' });",
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'babel.config.js'),
      [
        'module.exports = function (api) {',
        '  api.cache(true);',
        '  return {',
        "    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],",
        '    plugins: [],',
        '  };',
        '};',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'global.css'),
      ['@tailwind base;', '@tailwind components;', '@tailwind utilities;', ''].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'tailwind.config.js'),
      [
        "/** @type {import('tailwindcss').Config} */",
        'module.exports = {',
        "  presets: [require('nativewind/preset')],",
        '};',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'prettier.config.js'),
      [
        'module.exports = {',
        '  singleQuote: true,',
        "  plugins: [require.resolve('prettier-plugin-tailwindcss')],",
        "  tailwindAttributes: ['className'],",
        '};',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(path.join(projectPath, 'nativewind-env.d.ts'), '/// <reference types="nativewind/types" />\n', 'utf8');

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Tailwind App',
      defaults: 'uniwind',
    });

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.dependencies.nativewind).toBeUndefined();
    expect(packageJson.dependencies.uniwind).toBe('^1.6.4');
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.2.4');
    expect(packageJson.devDependencies['prettier-plugin-tailwindcss']).toBeUndefined();
    await expect(readFile(path.join(projectPath, 'metro.config.js'), 'utf8')).resolves.toContain(
      'withUniwindConfig'
    );
    await expect(readFile(path.join(projectPath, 'babel.config.js'), 'utf8')).resolves.not.toContain(
      'nativewind'
    );
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      "@import 'uniwind'"
    );
    await expect(readFile(path.join(projectPath, 'nativewind-env.d.ts'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(projectPath, 'tailwind.config.js'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(projectPath, 'prettier.config.js'), 'utf8')).resolves.not.toContain(
      'prettier-plugin-tailwindcss'
    );
  });

  it('can copy the bundled guidelines template', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-template-'));
    tempDirs.push(projectPath);

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      rich: false,
      appName: 'Template App',
      guidelinesTemplate: true,
      defaults: 'project-docs,guidelines,uniwind',
    });

    const guidelines = await readFile(path.join(projectPath, 'project', 'guidelines.md'), 'utf8');
    expect(guidelines).toContain('MrDJ Template Baseline');
    expect(guidelines).toContain('# Template App Guidelines');
    expect(guidelines).toContain('- project-docs');
    expect(guidelines).toContain('- guidelines');
  });

  it('can leave Uniwind ownership to create-expo-stack', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-external-uniwind-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'external-uniwind-app', scripts: {}, dependencies: {}, devDependencies: {} }),
      'utf8'
    );

    await scaffoldProjectMemory(projectPath, sampleAnswers('External Uniwind App'), {
      manageUniwind: false,
      richBoilerplate: true,
    });

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.dependencies.uniwind).toBeUndefined();
    expect(packageJson.devDependencies.tailwindcss).toBeUndefined();
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('Rich boilerplate');
  });

  it('can generate Supabase data guidance and opt out of test-to-main workflow', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-supabase-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'supabase-app', scripts: {}, dependencies: {}, devDependencies: {} }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Supabase App',
      dataStart: 'supabase',
      testToMain: false,
    });

    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies['@supabase/supabase-js']).toBe('^2.105.4');
    expect(packageJson.dependencies['@react-native-async-storage/async-storage']).toBe('2.2.0');
    expect(packageJson.dependencies['expo-sqlite']).toBeUndefined();
    await expect(readFile(path.join(projectPath, 'src', 'services', 'supabase.ts'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Two Supabase projects');
    await expect(
      readFile(path.join(projectPath, '.github', 'workflows', 'mrdj-pr-checks.yml'), 'utf8')
    ).rejects.toThrow();
  });

  it('keeps prompt helpers explicit about defaults, explanations, and server wording', () => {
    expect(validateRequiredInput('   ')).toBe('Please enter a value, or choose an option with a visible default.');
    expect(validateRequiredInput('   ', 'Visible default')).toBeUndefined();
    expect(validateRequiredInput('real answer')).toBeUndefined();

    expect(getServerPrompt('server', true, 'none')).toEqual({
      message: 'What type of server will this app be using?',
      defaultValue: 'standard-expo',
      shouldAsk: true,
      choices: ['standard-expo', 'custom', 'none'],
      explanation:
        'A deployed server means something beyond static app files: Expo Router API routes, server rendering, background jobs, custom backend services, or hosted logic.',
    });
    expect(getServerPrompt('static', true, 'none')).toEqual({
      message: 'Will this app require a separate deployed backend?',
      defaultValue: 'none',
      shouldAsk: true,
      choices: ['custom', 'none'],
      explanation: SERVER_OUTPUT_EXPLANATION,
    });
    expect(getServerPrompt('static', false, 'none').shouldAsk).toBe(false);

    expect(TEST_TO_MAIN_EXPLANATION).toContain('feature branches merge into a test branch');
    expect(PROJECT_INFO_EXPLANATION).toContain('product brief');
    expect(DATA_START_EXPLANATION).toContain('Local dummy data');
    expect(SUPER_STACK_ONBOARDING_INTRO).toBe('Super Stack onboarding by Mr. DJ');
    expect(SUPER_STACK_ONBOARDING_NOTE_TITLE).toBe("Let's plan the app");
    expect(SUPER_STACK_ONBOARDING_NOTE).toBe(
      'We will spend time defining the application and business now so the generated project memory gives agents real context.'
    );
    expect(SUPER_STACK_SUCCESS_MESSAGE).toContain(
      "You did it! You and your app are set up for success by completing this extensive onboarding."
    );
  });

  it('uses the preferred Super Stack defaults', () => {
    const plan = defaultOnboardPlan({ project: path.join(os.tmpdir(), 'default-app') });

    expect(plan.answers.deployedServer).toBe('none');
    expect(defaultOnboardPlan({ webOutput: 'server' }).answers.deployedServer).toBe('standard-expo');
    expect(defaultOnboardPlan({ webOutput: 'static', deployedServer: 'standard-expo' }).answers.deployedServer).toBe('none');
    expect(defaultOnboardPlan({ webOutput: 'static', deployedServer: 'custom' }).answers.deployedServer).toBe('custom');
    expect(plan.answers.includeCreateExpoComponents).toBe(false);
    expect(plan.answers.useLatestExpoSdk).toBe(true);
    expect(plan.answers.usesExpoUi).toBe(true);
    expect(plan.answers.usesExpoNativeTabs).toBe(true);
    expect(plan.guidelinesTemplate).toBe(true);
    expect(plan.answers.dataStart).toBe('local');
    expect(plan.answers.testToMainSafeguards).toBe(true);
  });

  it('derives defaults without requiring the old comma-separated interactive prompt', () => {
    expect(deriveDefaults(undefined, ['project-docs', 'uniwind'], 'supabase', true)).toEqual([
      'project-docs',
      'uniwind',
      'guidelines',
      'doctor',
      'supabase',
      'test-to-main',
    ]);
    expect(deriveDefaults('custom-default', ['project-docs'], 'local', false)).toEqual([
      'custom-default',
      'project-docs',
      'guidelines',
      'doctor',
    ]);
  });

  it('formats checkbox data-need selections with an Other escape hatch', () => {
    expect(DATA_NEED_OPTIONS).toContain('Backend database records');
    expect(DATA_NEED_OPTIONS).toContain('External APIs/integrations');
    expect(OTHER_DATA_NEEDS).toBe('__mrdj_other_data_needs__');
    expect(
      formatDataNeedsSelection(
        ['Local UI/app state', 'User accounts/authentication', OTHER_DATA_NEEDS],
        'Tournament bracket imports from CSV'
      )
    ).toBe(
      [
        '- Local UI/app state',
        '- User accounts/authentication',
        '- Other/custom notes: Tournament bracket imports from CSV',
      ].join('\n')
    );
  });
});

function sampleAnswers(appName: string): OnboardAnswers {
  return {
    appName,
    audience: 'Expo app users',
    coreFlows: 'Onboarding, primary app workflow, settings',
    dataNeeds: 'Local state first',
    deploymentTarget: 'Expo web/native deployment',
    advancedPackageSetup: true,
    includeCreateExpoComponents: true,
    useLatestExpoSdk: true,
    targetPlatforms: ['web', 'ios', 'android'],
    firstTargetPlatform: 'web',
    platformFileStrategy: 'files-only',
    webOutput: 'static',
    deployedServer: 'none',
    usesExpoUi: false,
    usesExpoNativeTabs: false,
    easUses: [],
    projectInfoReady: false,
    projectStyleReady: false,
    dataStart: 'local',
    testToMainSafeguards: true,
    defaults: ['project-docs', 'guidelines', 'uniwind', 'doctor'],
  };
}
