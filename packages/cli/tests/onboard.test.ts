import { stat } from 'node:fs/promises';
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
  loadPersonalOnboardDefaults,
  getServerPrompt,
  normalizePromptText,
  resolvePersonalOnboardDefaultsPath,
  runOnboardCommand,
  savePersonalOnboardDefaults,
  validateRequiredInput,
} from '../src/commands/onboard.js';
import { renderTodo, scaffoldProjectMemory } from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runOnboardCommand', () => {
  it('creates project memory files in non-interactive mode', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'sample-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
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
      '## App Name'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Core Flows and Features'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '# Tech Stack & CESS Onboarding'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.not.toContain('MDS_CESS_SNAPSHOT');
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.not.toContain('MDS Onboarding Decisions');
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.not.toContain('**App:**');
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.not.toContain('**Platforms:**');
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '# TodoForContext(optional): List any known screens that must be included in planning and implementation.'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '# TodoForContext(optional): Add monetization notes'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '# TodoForContext(optional): Describe the first real end-to-end user flow the MVP should support.'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.not.toContain('Agent should derive the first core user flows from project/info.md during intake.');
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Team Context'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Run `mds doctor --ci`'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'After the `project/info.md` markers are resolved, refresh the agent-derived roadmap from `project/info.md` and review it for accuracy.'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.not.toContain(
      'MDS_DERIVED_PHASE_'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'guidelines.md'), 'utf8')
    ).resolves.toContain('golden source of truth');
    await expect(
      readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')
    ).resolves.toContain('Visual Direction');
    await expect(
      readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')
    ).resolves.toContain('## Motion Tone');
    await expect(
      readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')
    ).resolves.toContain('MDS_STYLIST_THEME_START');
    await expect(
      readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')
    ).resolves.toContain('## Style Questions To Revisit');
    await expect(
      readFile(path.join(projectPath, 'project', 'theme.json'), 'utf8')
    ).resolves.toContain('"version": 1');
    await expect(
      readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')
    ).resolves.not.toContain('Keep Expo Router route files thin');
    await expect(readFile(path.join(projectPath, 'AGENTS.md'), 'utf8')).resolves.toContain(
      'project/` folder is the source of truth'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'intake-agent.md'), 'utf8')
    ).resolves.toContain('Ask conversational follow-up questions');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('Onboarding preview');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('flexGrow: 1');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('justifyContent: "center"');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('reanimated-color-picker');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'), 'utf8')
    ).resolves.toContain('EMBEDDED_GOOGLE_FONTS');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Save Theme');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('saveMessageBanner');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('humanizeSaveError');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain("const NATIVE_SAVE_COMMAND = 'npm run stylist:sync:android'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('npm run mds:stylist:sync -- --input-file');
    await expect(
      readFile(path.join(projectPath, 'src', 'theme', 'tokens.ts'), 'utf8')
    ).resolves.toContain('stylistThemeTokens');
    await expect(
      readFile(path.join(projectPath, 'src', 'theme', 'provider.tsx'), 'utf8')
    ).resolves.toContain('AppThemeProvider');
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'AppThemeProvider'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'RouterThemeBridge'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'GestureHandlerRootView'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'KeyboardProvider'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('useAppTheme');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'exposition', 'keyboard-form.tsx'),
        'utf8'
      )
    ).resolves.toContain("from 'react-native-keyboard-controller'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'exposition', 'keyboard-form.tsx'),
        'utf8'
      )
    ).resolves.not.toContain("require('react-native-keyboard-controller')");
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'), 'utf8')
    ).resolves.toContain('return null;');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Stylist');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('useSetAppTheme');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('StylistCheck');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Expo SQLite');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'index.tsx'), 'utf8')
    ).resolves.toContain('exposition-screen');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist.tsx'), 'utf8')
    ).resolves.toContain('stylist-screen');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'data.tsx'), 'utf8')
    ).resolves.toContain('data-screen');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'sdk-56.tsx'), 'utf8')
    ).resolves.toContain('expo-sdk-56-screen');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Expo SDK 56 Exposition');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain(
      "What's New in Expo SDK 56: Expo UI, Inline Swift/Kotlin Modules, and Faster Builds by Expo"
    );
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Everything new in Expo SDK 56 by Code with Beto');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('Live preview is active');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('SDK 56 overview article');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('chipRail');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Host, Column, Row, Collapsible, Button, Switch');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('and BottomSheet are all live here in one universal tree.');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain("label={isOpen ? 'Hide details' : 'Show details'}");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('styles.universalExampleBox');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('Real Expo UI subtree');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('textStyle={styles.textInputText}');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('https://docs.expo.dev/versions/latest/sdk/ui/universal/');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('ListItem.Supporting');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('Experimental');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('<BottomSheet');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('SoftwareMansionLogo');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Package Exposition');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Software Mansion - Reanimated');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain("paddingTop: Platform.OS === 'web' ? 92 : 20");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Software Mansion - Reanimated');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Kirill Zyusko - Keyboard Controller');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('reanimated-color-picker');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('@react-native-async-storage/async-storage');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('react-native-safe-area-context');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('tailwindcss/colors');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'), 'utf8')
    ).resolves.toContain("'scripts', 'stylist-sync-android.mjs'");
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'), 'utf8')
    ).resolves.toContain('MDS_STYLIST_INPUT_FILE');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'), 'utf8')
    ).resolves.not.toContain('pathToFileURL');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'), 'utf8')
    ).resolves.not.toContain('await import(');
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.toContain("path.join(projectRoot, 'project', 'theme.json')");
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.toContain('createRequire');
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.toContain("'managed'");
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.not.toContain('await import(');
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.toContain("node_modules', '@mr.dj2u', 'cli', 'dist', 'stylist-theme.js'");
    await expect(
      readFile(path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'), 'utf8')
    ).resolves.toContain('syncStylistTheme');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'mds', 'index.ts'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'exposition', 'index.ts'), 'utf8')
    ).resolves.toContain('AnimatedPressable');
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Phase 0: Orientation And Planning'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      "Review styling in the 'Stylist' page"
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.not.toContain(
      'MDS_DERIVED_PHASE_'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.not.toContain(
      'Apply Stylist synced theme tokens to production UI components and screens.'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Complete the one-time GitHub repo setup from `project/release-flow.md` so `test` and `main` are protected correctly.'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')
    ).resolves.not.toContain('Next Steps After Onboarding');
    await expect(readFile(path.join(projectPath, 'AGENTS.md'), 'utf8')).resolves.toContain(
      'build from `project/todo.md` in phase order'
    );
    await expect(
      readFile(path.join(projectPath, '.github', 'workflows', 'mds-pr-checks.yml'), 'utf8')
    ).resolves.toContain('MDS PR Checks');
    await expect(
      readFile(path.join(projectPath, 'project', 'release-flow.md'), 'utf8')
    ).resolves.toContain('Test-To-Main Safeguards');
    await expect(
      readFile(path.join(projectPath, 'project', 'release-flow.md'), 'utf8')
    ).resolves.toContain('Confirm GitHub Actions is enabled for the repo and that the generated workflow is allowed to run.');
    await expect(
      readFile(path.join(projectPath, 'project', 'release-flow.md'), 'utf8')
    ).resolves.toContain('If the agent has GitHub access with enough permissions, let it apply these repo settings for you; otherwise do this one-time setup in the GitHub UI.');
    await expect(readFile(path.join(projectPath, 'package.json'), 'utf8')).resolves.toContain(
      'clear-expo-start'
    );
    await expect(readFile(path.join(projectPath, 'package.json'), 'utf8')).resolves.toContain(
      'mds:continue'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'local-data.native.ts'), 'utf8')
    ).resolves.toContain('expo-sqlite');
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'local-data.ts'), 'utf8')
    ).resolves.not.toContain('expo-sqlite');
    await expect(readFile(path.join(projectPath, 'app', 'index.tsx'), 'utf8')).resolves.toContain(
      'home-screen'
    );
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain('settings-screen');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Legal onboarding');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('Continue to home');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'agreement-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('LegalDocumentView');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Account setup');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Continue to home');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain("router.replace('/')");
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen.tsx'), 'utf8')
    ).resolves.toContain('onboardingLegalDocuments.terms');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('/onboarding/account-setup');
    await expect(
      readFile(path.join(projectPath, 'app', 'onboarding', 'agreement.tsx'), 'utf8')
    ).resolves.toContain('agreement-screen');
    await expect(
      readFile(path.join(projectPath, 'app', 'onboarding', 'account-setup.tsx'), 'utf8')
    ).resolves.toContain('account-setup-screen');

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.scripts['expo-install-fix']).toBe('npx expo install --fix');
    expect(packageJson.scripts['expo-doctor']).toBe('npx expo-doctor');
    expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
    expect(packageJson.scripts['build:web']).toBe('expo export --platform web');
    expect(packageJson.scripts['post-create-check']).toBe(
      'npx expo install --fix && npx expo-doctor'
    );
    expect(packageJson.scripts['ci:verify']).toBe('npx mds doctor --ci');
    expect(packageJson.scripts['free-port']).toBe('npx mds free-port');
    expect(packageJson.scripts['clear-expo-start']).toBe('npx mds clear-expo-start');
    expect(packageJson.scripts['mds:stylist:sync']).toBe('npx mds stylist sync .');
    expect(packageJson.scripts['mds:eject']).toBe('npx mds eject .');
    expect(packageJson.scripts['mds:eject:exposition']).toBe('npx mds eject exposition .');
    expect(packageJson.scripts['mds:eject:stylist']).toBe('npx mds eject stylist .');
    expect(packageJson.scripts['stylist:sync:android']).toBe(
      'node ./scripts/stylist-sync-android.mjs'
    );
    expect(packageJson.dependencies['expo-sqlite']).toBe('~56.0.4');
    expect(packageJson.dependencies['@expo/ui']).toBe('~56.0.14');
    expect(packageJson.dependencies['expo-navigation-bar']).toBe('~56.0.3');
    expect(packageJson.dependencies['reanimated-color-picker']).toBe('^4.2.0');
    expect(packageJson.dependencies.uniwind).toBe('^1.6.4');
    const cliPackageJson = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(packageJson.devDependencies['@mr.dj2u/cli']).toBe(`^${cliPackageJson.version}`);
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.2.4');
  });

  it('adds react-native-css-interop Metro patch wiring for nativewind projects', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-nativewind-patch-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'nativewind-patch-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    const answers = sampleAnswers('Nativewind Patch App');
    answers.appDirectory = 'src';
    answers.defaults = ['project-docs', 'guidelines', 'doctor'];
    await scaffoldProjectMemory(projectPath, answers, {
      richBoilerplate: true,
      manageUniwind: false,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.scripts.postinstall).toBe('node ./scripts/patch-nativewind-metro.cjs');
    expect(packageJson.scripts.prestart).toBe('node ./scripts/patch-nativewind-metro.cjs');
    expect(packageJson.scripts.preandroid).toBe('node ./scripts/patch-nativewind-metro.cjs');
    expect(packageJson.scripts.preweb).toBe('node ./scripts/patch-nativewind-metro.cjs');
    expect(packageJson.scripts['patch:nativewind-metro']).toBe(
      'node ./scripts/patch-nativewind-metro.cjs'
    );
    expect(packageJson.devDependencies['patch-package']).toBeUndefined();
    await expect(
      readFile(path.join(projectPath, 'scripts', 'patch-nativewind-metro.cjs'), 'utf8')
    ).resolves.toContain('changes: {');
    await expect(
      readFile(path.join(projectPath, 'scripts', 'patch-nativewind-metro.cjs'), 'utf8')
    ).resolves.toContain('modifiedFiles: new Map');
  });

  it('normalizes existing project info and style while preserving imported notes', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-existing-memory-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'memory-app' }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Old Notes\n\nUsers are bowling league captains.\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'style.md'),
      '# Style Dump\n\nUse loud tournament energy.\n',
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Memory App',
      audience: 'Bowling league captains',
      coreFlows: 'Create league, invite players, publish brackets',
      screens: 'Home, league detail, bracket editor',
      dataNeeds: 'Leagues, players, match results',
      deploymentTarget: 'Web first, mobile later',
      rich: false,
    });

    const info = await readFile(path.join(projectPath, 'project', 'info.md'), 'utf8');
    expect(info).toContain('## Target Users');
    expect(info).toContain('## Imported Notes');
    expect(info).toContain('Users are bowling league captains.');
    expect(info).toContain('## Monetization Strategy');
    expect(info).toContain('## Screens');
    expect(info).toContain('# Tech Stack & CESS Onboarding');

    const style = await readFile(path.join(projectPath, 'project', 'style.md'), 'utf8');
    expect(style).toContain('## Brand/References');
    expect(style).toContain('## Imported Notes');
    expect(style).toContain('Use loud tournament energy.');

    await expect(
      readFile(path.join(projectPath, 'project', 'intake-agent.md'), 'utf8')
    ).resolves.toContain('Imported Notes');
  });

  it('upgrades existing Tailwind 3 projects to the Uniwind Tailwind 4 peer', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-tailwind-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'tailwind-app',
        scripts: {},
        dependencies: { nativewind: 'latest' },
        devDependencies: {
          tailwindcss: '^3.4.0',
          'prettier-plugin-tailwindcss': '^0.5.11',
        },
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
    await writeFile(
      path.join(projectPath, 'nativewind-env.d.ts'),
      '/// <reference types="nativewind/types" />\n',
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Tailwind App',
      defaults: 'uniwind',
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
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
    await expect(
      readFile(path.join(projectPath, 'babel.config.js'), 'utf8')
    ).resolves.not.toContain('nativewind');
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      "@import 'uniwind'"
    );
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      'MDS_STYLIST_THEME_START'
    );
    await expect(readFile(path.join(projectPath, 'nativewind-env.d.ts'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(projectPath, 'tailwind.config.js'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'prettier.config.js'), 'utf8')
    ).resolves.not.toContain('prettier-plugin-tailwindcss');
  });

  it('can copy the bundled guidelines template', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-template-'));
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
    expect(guidelines).toContain('MDS Template Baseline');
    expect(guidelines).toContain('# Template App Guidelines');
    expect(guidelines).toContain('- project-docs');
    expect(guidelines).toContain('- guidelines');
  });

  it('can leave Uniwind ownership to create-expo-stack', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-external-uniwind-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'external-uniwind-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await scaffoldProjectMemory(projectPath, sampleAnswers('External Uniwind App'), {
      manageUniwind: false,
      richBoilerplate: true,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.dependencies.uniwind).toBeUndefined();
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.2.4');
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('Onboarding preview');
  });

  it('can generate Expo Router exposition routes under src/app', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-src-app-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'src-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      'export default function Layout() { return null; }\n',
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Src App',
      appDirectory: 'src',
      platformLayouts: 'platform-specific',
    });

    await expect(
      readFile(path.join(projectPath, 'src', 'app', 'exposition', 'index.tsx'), 'utf8')
    ).resolves.toContain('../../features/exposition/exposition-screen');
    await expect(
      readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8')
    ).resolves.toContain("import '../../global.css';");
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '`src/app`'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'guidelines.md'), 'utf8')
    ).resolves.toContain('platform-specific layouts');
  });

  it('preserves an existing tabs or drawer layout while replacing starter routes', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-tabs-layout-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'tabs-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app', '_layout.tsx'),
      [
        "import { Tabs } from 'expo-router';",
        '',
        'export default function Layout() {',
        '  return <Tabs />;',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app', 'details.tsx'),
      'export default function Details() { return null; }\n',
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Tabs App',
      createExpoComponents: false,
    });

    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'return <Tabs />'
    );
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'index.tsx'), 'utf8')
    ).resolves.toContain('home-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'exposition.tsx'), 'utf8')
    ).resolves.toContain('exposition-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'two.tsx'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'stylist.tsx'), 'utf8')
    ).resolves.toContain('stylist-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'data.tsx'), 'utf8')
    ).resolves.toContain('data-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', 'sdk-56.tsx'), 'utf8')
    ).resolves.toContain('expo-sdk-56-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('if (Platform.OS === "android")');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain("import { Tabs } from 'expo-router'");
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('Platform.OS');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.toContain('<NativeTabs.Trigger name="exposition"');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.toContain('<NativeTabs.Trigger.Label>Exposition</NativeTabs.Trigger.Label>');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.toContain('<NativeTabs.Trigger name="sdk-56"');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('<NativeTabs.Trigger name="nativewindui">');
    await expect(
      readFile(path.join(projectPath, 'app', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('Tab One');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.not.toContain("href: '/exposition'");
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'index.tsx'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'), 'utf8')
    ).resolves.toContain('runStylistSync');
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain('settings-screen');
    await expect(readFile(path.join(projectPath, 'app', 'details.tsx'), 'utf8')).rejects.toThrow();
  });

  it('writes explicit drawer and tab labels for drawer + tabs layouts', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-drawer-tabs-layout-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app', '(drawer)', '(tabs)'), {
      recursive: true,
    });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'drawer-tabs-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app', '_layout.tsx'),
      [
        "import { Drawer } from 'expo-router/drawer';",
        '',
        'export default function Layout() {',
        '  return <Drawer />;',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app', '(drawer)', '_layout.tsx'),
      [
        "import { Drawer } from 'expo-router/drawer';",
        '',
        'export default function DrawerLayout() {',
        '  return <Drawer />;',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'),
      [
        "import { Tabs } from 'expo-router';",
        '',
        'export default function DrawerTabsLayout() {',
        '  return <Tabs />;',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Drawer Tabs App',
      createExpoComponents: false,
    });

    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '_layout.tsx'), 'utf8')
    ).resolves.toContain(
      "name=\"(tabs)\" options={{ title: 'Exposition', drawerLabel: 'Exposition' }}"
    );
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('if (Platform.OS === "android")');
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.toContain('<NativeTabs.Trigger name="sdk-56"');
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.toContain('<NativeTabs.Trigger.Label>SDK 56</NativeTabs.Trigger.Label>');
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'), 'utf8')
    ).resolves.not.toContain('<NativeTabs.Trigger name="nativewindui">');
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', 'stylist.tsx'), 'utf8')
    ).resolves.toContain('stylist-screen');
    await expect(
      readFile(path.join(projectPath, 'app', '(drawer)', '(tabs)', 'two.tsx'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.not.toContain("href: '/exposition'");
  });

  it('can generate Supabase data guidance and opt out of test-to-main workflow', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-supabase-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'supabase-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Supabase App',
      dataStart: 'supabase',
      testToMain: false,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies['@supabase/supabase-js']).toBe('^2.105.4');
    expect(packageJson.dependencies['@react-native-async-storage/async-storage']).toBe('2.2.0');
    expect(packageJson.dependencies['expo-sqlite']).toBeUndefined();
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase.ts'), 'utf8')
    ).resolves.toContain('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Two Supabase projects');
    await expect(
      readFile(path.join(projectPath, '.github', 'workflows', 'mds-pr-checks.yml'), 'utf8')
    ).rejects.toThrow();
  });

  it('generates the NativeWindUI exposition route when NativeWindUI is selected', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-nativewindui-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'nativewindui-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'NativeWindUI App',
      defaults: 'project-docs,uniwind,nativewindui',
    });

    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('NativeWindUI Exposition');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'nativewindui.tsx'), 'utf8')
    ).resolves.toContain('nativewindui-screen');
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'AppThemeProvider'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'GestureHandlerRootView'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'KeyboardProvider'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      "name=\"exposition/nativewindui\""
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain("href: '/exposition/nativewindui'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ActivityIndicator.tsx'),
        'utf8'
      )
    ).resolves.toContain('export function ActivityIndicator');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ThemeToggle.tsx'),
        'utf8'
      )
    ).resolves.toContain('export function ThemeToggle');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ThemeToggle.tsx'),
        'utf8'
      )
    ).resolves.toContain('lightLabel');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'), 'utf8')
    ).resolves.toContain("typeof style === 'function' ? style(state) : style");
  });

  it('keeps prompt helpers explicit about defaults, explanations, and server wording', () => {
    expect(validateRequiredInput('   ')).toBe(
      'Please enter a value, or choose an option with a visible default.'
    );
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
    expect(SUPER_STACK_ONBOARDING_INTRO).toBe('MDS Super Stack onboarding');
    expect(SUPER_STACK_ONBOARDING_NOTE_TITLE).toBe("Let's plan the app");
    expect(SUPER_STACK_ONBOARDING_NOTE).toBe(
      'We will plan first, especially for thin ideas. You can paste a research plan or existing project memory, and MDS will normalize it into canonical project files before generation.'
    );
    expect(SUPER_STACK_SUCCESS_MESSAGE).toContain(
      'You did it! You and your app are set up for success by completing this extensive onboarding.'
    );
  });

  it('uses the preferred Super Stack defaults', () => {
    const plan = defaultOnboardPlan({
      project: path.join(os.tmpdir(), 'default-app'),
    });

    expect(plan.answers.deployedServer).toBe('none');
    expect(defaultOnboardPlan({ webOutput: 'server' }).answers.deployedServer).toBe(
      'standard-expo'
    );
    expect(
      defaultOnboardPlan({
        webOutput: 'static',
        deployedServer: 'standard-expo',
      }).answers.deployedServer
    ).toBe('none');
    expect(
      defaultOnboardPlan({ webOutput: 'static', deployedServer: 'custom' }).answers.deployedServer
    ).toBe('custom');
    expect(plan.answers.includeCreateExpoComponents).toBe(false);
    expect(plan.answers.usesExpoUi).toBe(true);
    expect(plan.answers.usesExpoUiUniversalComponents).toBe(true);
    expect(defaultOnboardPlan({ expoUi: false }).answers.usesExpoUiUniversalComponents).toBe(false);
    expect(plan.answers.usesExpoNativeTabs).toBe(true);
    expect(plan.answers.appDirectory).toBe('src');
    expect(plan.answers.platformLayoutMode).toBe('shared');
    expect(plan.guidelinesTemplate).toBe(true);
    expect(plan.saveDefaults).toBe(false);
    expect(plan.answers.dataStart).toBe('local');
    expect(plan.answers.testToMainSafeguards).toBe(true);
    expect(defaultOnboardPlan({ saveDefaults: true }).saveDefaults).toBe(true);
  });

  it('adds a Phase 0 manual EAS setup step when EAS is planned', () => {
    const todo = renderTodo(
      defaultOnboardPlan({
        project: path.join(os.tmpdir(), 'default-app'),
        easSelected: true,
        easUses: ['building mobile applications'],
      }).answers
    );

    expect(todo).toContain('- [ ] Sign in and set up EAS in the terminal.');
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
    expect(OTHER_DATA_NEEDS).toBe('__mds_other_data_needs__');
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

  it('resolves personal defaults path from env when provided', () => {
    const previous = process.env.MDS_ONBOARD_DEFAULTS_PATH;
    const customPath = path.join(os.tmpdir(), 'mds-onboard-custom-defaults.json');
    try {
      process.env.MDS_ONBOARD_DEFAULTS_PATH = customPath;
      expect(resolvePersonalOnboardDefaultsPath()).toBe(path.resolve(customPath));
    } finally {
      if (previous === undefined) {
        delete process.env.MDS_ONBOARD_DEFAULTS_PATH;
      } else {
        process.env.MDS_ONBOARD_DEFAULTS_PATH = previous;
      }
    }
  });

  it('saves defaults atomically and normalizes malformed saved values when loading', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-defaults-'));
    tempDirs.push(projectPath);
    const defaultsPath = path.join(projectPath, 'onboard-defaults.json');
    const previousPath = process.env.MDS_ONBOARD_DEFAULTS_PATH;
    const previousDisable = process.env.MDS_DISABLE_PERSONAL_DEFAULTS;
    const previousVitest = process.env.VITEST;
    const previousVitestWorker = process.env.VITEST_WORKER_ID;

    try {
      process.env.MDS_ONBOARD_DEFAULTS_PATH = defaultsPath;
      delete process.env.MDS_DISABLE_PERSONAL_DEFAULTS;
      delete process.env.VITEST;
      delete process.env.VITEST_WORKER_ID;

      const savedPath = savePersonalOnboardDefaults(sampleAnswers('Defaults App'));
      expect(savedPath).toBe(defaultsPath);
      await expect(readFile(defaultsPath, 'utf8')).resolves.toContain('"defaults"');
      if (process.platform !== 'win32') {
        const fileStats = await stat(defaultsPath);
        expect(fileStats.mode & 0o777).toBe(0o600);
      }

      await writeFile(
        defaultsPath,
        JSON.stringify({
          defaults: ['guidelines', 42, '  '],
          targetPlatforms: ['web', 'ios', false],
          firstTargetPlatform: 1,
          platformFileStrategy: 'invalid',
          appDirectory: 'src',
          platformLayoutMode: 'shared',
          webOutput: 'server',
          deployedServer: 'custom',
          expoServerAdapter: 'express',
          customBackend: 'true',
          customBackendEntry: 10,
          usesExpoUi: 'yes',
          usesExpoNativeTabs: false,
          includeCreateExpoComponents: true,
          dataStart: 'supabase',
          testToMainSafeguards: true,
          easUses: ['hosting web apps', null],
        }),
        'utf8'
      );

      expect(loadPersonalOnboardDefaults()).toEqual({
        defaults: ['guidelines'],
        targetPlatforms: ['web', 'ios'],
        appDirectory: 'src',
        platformLayoutMode: 'shared',
        webOutput: 'server',
        deployedServer: 'custom',
        expoServerAdapter: 'express',
        usesExpoNativeTabs: false,
        includeCreateExpoComponents: true,
        dataStart: 'supabase',
        testToMainSafeguards: true,
        easUses: ['hosting web apps'],
      });
    } finally {
      if (previousPath === undefined) {
        delete process.env.MDS_ONBOARD_DEFAULTS_PATH;
      } else {
        process.env.MDS_ONBOARD_DEFAULTS_PATH = previousPath;
      }
      if (previousDisable === undefined) {
        delete process.env.MDS_DISABLE_PERSONAL_DEFAULTS;
      } else {
        process.env.MDS_DISABLE_PERSONAL_DEFAULTS = previousDisable;
      }
      if (previousVitest === undefined) {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = previousVitest;
      }
      if (previousVitestWorker === undefined) {
        delete process.env.VITEST_WORKER_ID;
      } else {
        process.env.VITEST_WORKER_ID = previousVitestWorker;
      }
    }
  });
});

describe('normalizePromptText', () => {
  it('returns an empty string for undefined optional prompt answers', () => {
    expect(normalizePromptText(undefined)).toBe('');
  });

  it('trims string prompt answers', () => {
    expect(normalizePromptText('  Home, settings  ')).toBe('Home, settings');
  });
});

function sampleAnswers(appName: string): OnboardAnswers {
  return {
    appName,
    audience: 'Expo app users',
    coreFlows: 'Onboarding, primary app workflow, settings',
    screens: 'Home, onboarding, settings',
    dataNeeds: 'Local state first',
    deploymentTarget: 'Expo web/native deployment',
    advancedPackageSetup: true,
    includeCreateExpoComponents: true,
    targetPlatforms: ['web', 'ios', 'android'],
    firstTargetPlatform: 'web',
    platformFileStrategy: 'files-only',
    webOutput: 'static',
    deployedServer: 'none',
    usesExpoUi: false,
    usesExpoUiUniversalComponents: false,
    usesExpoNativeTabs: false,
    easUses: [],
    projectInfoReady: false,
    projectStyleReady: false,
    appDirectory: 'root',
    platformLayoutMode: 'shared',
    dataStart: 'local',
    testToMainSafeguards: true,
    defaults: ['project-docs', 'guidelines', 'uniwind', 'doctor'],
  };
}
