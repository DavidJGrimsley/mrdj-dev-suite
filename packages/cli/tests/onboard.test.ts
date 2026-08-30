import { access, stat } from 'node:fs/promises';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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
  resolveSupabaseLocalEnvironment,
  runOnboardCommand,
  savePersonalOnboardDefaults,
  validateRequiredInput,
} from '../src/commands/onboard.js';
import {
  deriveOnboardingPersistence,
  renderInfo,
  renderTodo,
  scaffoldProjectMemory,
} from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const tempDirs: string[] = [];
const DEFAULT_SUPABASE_ENV_LOCAL = [
  'EXPO_PUBLIC_SUPABASE_URL=https://bvzekjnvpkbcdobccffn.supabase.co',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable__NjNz5Lsu6MhXgqdpWOihQ_yxKo22M-',
  'EXPO_PUBLIC_SUPABASE_KEY=sb_publishable__NjNz5Lsu6MhXgqdpWOihQ_yxKo22M-',
  '',
].join('\n');

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runOnboardCommand', () => {
  it('runs retrospective project-only onboarding from an initialized workspace checkout', async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'mds-retrospective-workspace-'));
    tempDirs.push(workspaceRoot);
    const appPath = path.join(workspaceRoot, 'sample-main');
    const projectPath = path.join(workspaceRoot, 'project');
    await mkdir(path.join(appPath, '.mds'), { recursive: true });
    await mkdir(path.join(appPath, 'src', 'app'), { recursive: true });
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, 'mds.workspace.json'),
      JSON.stringify({
        schemaVersion: 1,
        workspaceId: 'sample',
        name: 'Sample',
        repositories: [
          {
            id: 'source',
            remote: 'https://github.com/example/sample.git',
            defaultBranch: 'main',
            mainFolder: 'sample-main',
            worktreePrefix: 'sample-',
          },
        ],
        project: { path: 'project' },
        temp: { path: 'temp' },
      }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(appPath, '.mds', 'workspace.json'),
      JSON.stringify({ schemaVersion: 1, workspaceId: 'sample' }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(appPath, 'README.md'),
      '# Sample Memory\n\nA repo with enough evidence to draft project memory.\n',
      'utf8'
    );
    await writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({
        name: 'sample-memory',
        scripts: { start: 'expo start' },
        dependencies: { expo: '^56.0.0', 'expo-router': '^6.0.0' },
      }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(appPath, 'src', 'app', 'index.tsx'),
      'export default function Index() { return null; }\n',
      'utf8'
    );

    await runOnboardCommand({
      project: appPath,
      yes: true,
      retrospective: true,
      projectOnly: true,
    });

    await expect(readFile(path.join(projectPath, 'info.md'), 'utf8')).resolves.toContain(
      '# TodoForContext(optional): Confirm who this app is for'
    );
    await expect(readFile(path.join(projectPath, 'onboarding-evidence.md'), 'utf8')).resolves.toContain(
      'src/app/index.tsx'
    );
    await expect(stat(path.join(appPath, 'src', 'features'))).rejects.toThrow();
  });

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
      noInstall: true,
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
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Component Strategy'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '- Decision: pending'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Confirm the Phase 0 component strategy in `project/info.md`'
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
    ).resolves.not.toContain(
      'Agent should derive the first core user flows from project/info.md during intake.'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '## Team Context'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Run `mds doctor --ci`'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'After the `project/info.md` markers are resolved, review the `mds roadmap` proposal and approve any task wording before using `mds roadmap --append`.'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')
    ).resolves.not.toContain('MDS_DERIVED_PHASE_');
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
    ).resolves.toContain('Onboarding');
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
    await expect(
      readFile(path.join(projectPath, 'src', 'theme', 'color-utils.ts'), 'utf8')
    ).resolves.toContain('getReadableTextColor');
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
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.toContain(
      'theme.activeScheme'
    );
    await expect(readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8')).resolves.not.toContain(
      'theme.colorSystem.previewScheme'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'theme', 'provider.tsx'), 'utf8')
    ).resolves.toContain('Appearance.getColorScheme');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('{ color: colors.secondary }');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('#1d4ed8');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('backgroundColor: colors.secondary');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain("from '../../theme/color-utils'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('#1d4ed8');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('#eff6ff');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain('useAppTheme');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('ExpositionNotice');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'swmansion', 'keyboard-form.tsx'),
        'utf8'
      )
    ).resolves.toContain("from 'react-native-keyboard-controller'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'swmansion', 'keyboard-form.tsx'),
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
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.not.toContain('Supabase environments and branches');
    await expect(
      access(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'))
    ).rejects.toThrow();
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
    ).resolves.toContain('styles.textInputText');
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
    await expect(
      readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')
    ).resolves.not.toContain('MDS_DERIVED_PHASE_');
    await expect(
      readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')
    ).resolves.not.toContain(
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
    ).resolves.toContain(
      'Confirm GitHub Actions is enabled for the repo and that the generated workflow is allowed to run.'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'release-flow.md'), 'utf8')
    ).resolves.toContain(
      'If the agent has GitHub access with enough permissions, let it apply these repo settings for you; otherwise do this one-time setup in the GitHub UI.'
    );
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
        path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('onboardingConfig.welcomeTitle');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'),
        'utf8'
      )
    ).resolves.not.toContain('Continue to home');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'),
        'utf8'
      )
    ).resolves.toContain("mode: 'enter-app'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('featureHighlights');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('onboardingConfig.completion');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
        'utf8'
      )
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen.tsx'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('nextRouteAfterWelcome');
    await expect(
      readFile(path.join(projectPath, 'app', 'onboarding', 'features.tsx'), 'utf8')
    ).resolves.toContain('features-screen');
    await expect(
      readFile(path.join(projectPath, 'app', 'onboarding', 'complete.tsx'), 'utf8')
    ).resolves.toContain('complete-screen');

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
    expect(packageJson.scripts['react-doctor']).toBe('npx react-doctor -y --no-telemetry');
    expect(packageJson.scripts['mds:react-doctor']).toBe('npx mds run react-doctor');
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
    expect(packageJson.dependencies['expo-splash-screen']).toBe('~56.0.14');
    expect(packageJson.dependencies['reanimated-color-picker']).toBe('^4.2.0');
    expect(packageJson.dependencies.uniwind).toBe('^1.6.4');
    const cliPackageJsonPath =
      path.basename(process.cwd()) === 'cli'
        ? path.join(process.cwd(), 'package.json')
        : path.join(process.cwd(), 'packages', 'cli', 'package.json');
    const cliPackageJson = JSON.parse(await readFile(cliPackageJsonPath, 'utf8')) as {
      version: string;
    };
    expect(packageJson.devDependencies['@mr.dj2u/cli']).toBe(`^${cliPackageJson.version}`);
    expect(packageJson.devDependencies['react-doctor']).toBe('^0.9.12');
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.2.4');
    await expect(
      readFile(path.join(projectPath, 'doctor.config.json'), 'utf8')
    ).resolves.toContain('react.doctor/schema/config.json');
    await expect(readFile(path.join(projectPath, 'README.md'), 'utf8')).resolves.toContain(
      '## React Doctor (code quality checks)'
    );
    await expect(access(path.join(projectPath, 'assets', 'images', 'splash-icon.png'))).resolves.toBeUndefined();
    await expect(
      access(path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png'))
    ).resolves.toBeUndefined();
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
    answers.generatorStylingSystem = 'nativewind';
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
      noInstall: true,
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
      noInstall: true,
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
      noInstall: true,
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
    ).resolves.toContain('Onboarding');
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
      noInstall: true,
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
      noInstall: true,
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
      noInstall: true,
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
      noInstall: true,
      appName: 'Supabase App',
      dataStart: 'supabase',
      testToMain: false,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      main?: string;
      dependencies: Record<string, string>;
    };
    expect(packageJson.main).toBe('expo-router/entry');
    expect(packageJson.dependencies['expo-router']).toBe('~56.2.19');
    expect(packageJson.dependencies['@supabase/supabase-js']).toBe('^2.112.3');
    expect(packageJson.dependencies['@react-native-async-storage/async-storage']).toBe('2.2.0');
    await expect(readFile(path.join(projectPath, '.env.local'), 'utf8')).resolves.toBe(
      DEFAULT_SUPABASE_ENV_LOCAL
    );
    await expect(readFile(path.join(projectPath, '.gitignore'), 'utf8')).resolves.toContain(
      '.env.local'
    );
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_URL='
    );
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='
    );
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_KEY='
    );
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.not.toContain(
      'bvzekjnvpkbcdobccffn'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase.ts'), 'utf8')
    ).resolves.toContain('@react-native-async-storage/async-storage');
    await expect(
      readFile(path.join(projectPath, 'src', 'db', 'adapter.ts'), 'utf8')
    ).resolves.toContain('DatabaseAdapter');
    await expect(
      readFile(path.join(projectPath, 'src', 'db', 'index.ts'), 'utf8')
    ).resolves.toContain("getAdapter(type: 'supabase' = 'supabase')");
    await expect(
      readFile(path.join(projectPath, 'src', 'db', 'supabase.ts'), 'utf8')
    ).resolves.toContain('createSupabaseDatabaseAdapter');
    await expect(
      readFile(path.join(projectPath, 'src', 'types', 'database.ts'), 'utf8')
    ).resolves.toContain('mds_demo_guestbook_comments');
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'), 'utf8')
    ).resolves.toContain("import { getAdapter } from '../db';");
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'), 'utf8')
    ).resolves.toContain("table: 'mds_demo_guestbook_comments'");
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'), 'utf8')
    ).resolves.toContain("mds_guestbook_recent");
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'), 'utf8')
    ).resolves.toContain('DatabaseUnauthorizedError');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Supabase environments and branches');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Database adapter active');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('server/RPC for multi-step writes');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Guestbook reads prefer the database adapter');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Users signed up');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('Sign the guestbook');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain('backgroundColor: colors.secondary');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'utf8')
    ).resolves.toContain("from '../../theme/color-utils'");
    await expect(
      readFile(path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'), 'utf8')
    ).resolves.toContain('mds_guestbook_sign');
    await expect(
      readFile(
        path.join(projectPath, 'supabase', 'migrations', '0002_mds_data_exposition.sql'),
        'utf8'
      )
    ).resolves.toContain('mds_demo_signup_count');
    await expect(
      readFile(
        path.join(projectPath, 'supabase', 'migrations', '0002_mds_data_exposition.sql'),
        'utf8'
      )
    ).resolves.toContain('grant select on public.mds_demo_guestbook_comments to anon, authenticated;');
    await expect(
      readFile(path.join(projectPath, '.github', 'workflows', 'mds-pr-checks.yml'), 'utf8')
    ).rejects.toThrow();
  });

  it('aligns generated router dependencies to an existing Expo 57 project', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-expo57-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'expo57-app',
          version: '1.0.0',
          main: 'index.ts',
          scripts: {},
          dependencies: {
            expo: '~57.0.17',
            'expo-status-bar': '~57.0.1',
            react: '19.2.3',
            'react-native': '0.86.3',
          },
          devDependencies: {
            '@types/react': '~19.2.2',
            typescript: '~6.0.3',
          },
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(
        {
          extends: 'expo/tsconfig.base',
          compilerOptions: {
            strict: true,
          },
        },
        null,
        2
      ),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'Expo 57 App',
      authProvider: 'supabase',
      legalDocumentMode: 'public-routes',
      onboardingCompletionMode: 'auth',
      legalBusinessName: 'Expo 57 Legal LLC',
      legalContactEmail: 'privacy@expo57.test',
      legalAddressOrRegionNote: 'New York, USA',
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      main?: string;
      dependencies: Record<string, string>;
    };
    expect(packageJson.main).toBe('expo-router/entry');
    expect(packageJson.dependencies['expo-constants']).toBe('~57.0.15');
    expect(packageJson.dependencies['expo-font']).toBe('~57.0.1');
    expect(packageJson.dependencies['expo-router']).toBe('~57.0.17');
    expect(packageJson.dependencies['expo-linking']).toBe('~57.0.8');
    expect(packageJson.dependencies['expo-system-ui']).toBe('~57.0.3');
    expect(packageJson.dependencies['react-native-safe-area-context']).toBe('~5.7.0');
    expect(packageJson.dependencies['expo-sqlite']).toBe('~57.0.2');
    expect(packageJson.dependencies['expo-splash-screen']).toBe('~57.0.8');
    expect(packageJson.dependencies['expo-navigation-bar']).toBe('~57.0.2');
    expect(packageJson.dependencies['@expo/ui']).toBe('~57.0.14');
    expect(packageJson.dependencies['react-native-gesture-handler']).toBe('~2.32.0');
    expect(packageJson.dependencies['react-native-reanimated']).toBe('4.5.1');
    expect(packageJson.dependencies['react-native-screens']).toBe('~4.26.0');
    expect(packageJson.dependencies['react-native-keyboard-controller']).toBe('1.21.9');
    expect(packageJson.dependencies['react-native-worklets']).toBe('0.10.1');
    expect(packageJson.dependencies['reanimated-color-picker']).toBe('^5.1.2');

    const tsconfig = await readFile(path.join(projectPath, 'tsconfig.json'), 'utf8');
    expect(tsconfig).toContain('"@/*"');
    expect(tsconfig).toContain('"./src/*"');
    expect(tsconfig).toContain('"node"');
    expect(tsconfig).toContain('"uniwind/types"');
    expect(tsconfig).not.toContain('"baseUrl"');

    await expect(readFile(path.join(projectPath, 'expo-env.d.ts'), 'utf8')).resolves.toContain(
      'expo/types'
    );
    await expect(readFile(path.join(projectPath, 'css-env.d.ts'), 'utf8')).resolves.toContain(
      "declare module '*.css';"
    );
    await expect(readFile(path.join(projectPath, 'uniwind-types.d.ts'), 'utf8')).resolves.toContain(
      "declare module 'uniwind'"
    );

    const settingsRoute = await readFile(path.join(projectPath, 'src', 'app', 'settings.tsx'), 'utf8');
    expect(settingsRoute).toContain("import SettingsScreen from '../features/settings/settings-screen';");
    expect(settingsRoute).toContain('const auth = useAuthAdapter();');
    expect(settingsRoute).not.toContain('createPlaceholderAuthAdapter');
  });

  it('generates MDS auth routes, docs, and protected layouts when auth is selected', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-auth-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'auth-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'Auth App',
      authProvider: 'supabase',
      supabaseUrl: 'https://custom-project.supabase.co',
      supabasePublishableKey: 'sb_publishable_custom',
      onboardingCompletionMode: 'auth',
      legalUpdateGate: 'material-required',
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies['@supabase/supabase-js']).toBe('^2.112.3');
    expect(packageJson.dependencies['@react-native-async-storage/async-storage']).toBe('2.2.0');
    expect(packageJson.dependencies['expo-router']).toBe('~56.2.19');
    expect(packageJson.dependencies['react-native-screens']).toBe('4.27.0');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'auth', 'auth-provider.tsx'), 'utf8')
    ).resolves.toContain('useAuth');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'auth', 'auth-adapter.tsx'), 'utf8')
    ).resolves.toContain('signInWithPassword');
    await expect(readFile(path.join(projectPath, 'project', 'auth.md'), 'utf8')).resolves.toContain(
      'Supabase Auth'
    );
    await expect(
      readFile(path.join(projectPath, 'app', '(auth)', 'sign-in.tsx'), 'utf8')
    ).resolves.toContain('AuthScreen');
    await expect(
      readFile(
        path.join(projectPath, 'supabase', 'migrations', '0001_mds_auth_onboarding.sql'),
        'utf8'
      )
    ).resolves.toContain('auth.uid()');
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
    await expect(readFile(path.join(projectPath, '.env.local'), 'utf8')).resolves.toBe(
      [
        'EXPO_PUBLIC_SUPABASE_URL=https://custom-project.supabase.co',
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_custom',
        'EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_custom',
        '',
      ].join('\n')
    );
    await expect(readFile(path.join(projectPath, '.gitignore'), 'utf8')).resolves.toContain(
      '.env.local'
    );
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.not.toContain(
      'custom-project'
    );
    await expect(readFile(path.join(projectPath, 'project', 'auth.md'), 'utf8')).resolves.toContain(
      '.env.example'
    );
    const rootLayout = await readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8');
    expect(rootLayout).toContain(
      "import { AuthProvider, useAuth } from '../src/features/auth/auth-provider';"
    );
    expect(rootLayout).toContain('<AuthProvider>');
    expect(rootLayout).toContain('<Stack.Protected guard={!auth.isAuthenticated}>');
    expect(rootLayout).toContain('<Stack.Screen name="(auth)/sign-in"');
    expect(rootLayout).toContain('useOnboardingState(auth.user?.id)');
    expect(rootLayout).toContain('const onboardingIsReady = !onboarding.isLoading;');
    expect(rootLayout).toContain(
      'const onboardingComplete = onboardingIsReady && Boolean(onboarding.state?.completedAt);'
    );
    expect(rootLayout).toContain(
      '<Stack.Protected guard={auth.isAuthenticated && !onboardingComplete}>'
    );
    expect(rootLayout).toContain(
      '<Stack.Protected guard={auth.isAuthenticated && onboardingComplete && legalGateStatus === "complete"}>'
    );
    const protectedAppRouteIndex = rootLayout.indexOf(
      '<Stack.Protected guard={auth.isAuthenticated && onboardingComplete && legalGateStatus === "complete"}>'
    );
    const publicLegalRouteIndex = rootLayout.indexOf('<Stack.Screen name="terms"');
    expect(protectedAppRouteIndex).toBeGreaterThanOrEqual(0);
    expect(publicLegalRouteIndex).toBeGreaterThanOrEqual(0);
    expect(protectedAppRouteIndex).toBeLessThan(publicLegalRouteIndex);
    expect(rootLayout).toContain('<Stack.Screen name="onboarding/legal"');
    expect(rootLayout).not.toContain('<Stack.Screen name="onboarding/complete"');
    expect(rootLayout).toContain('OnboardingPersistenceSync');
    expect(rootLayout).toContain('useLegalUpdateGateStatus(undefined, auth.user?.id)');
    const onboardingStateAdapter = await readFile(
      path.join(projectPath, 'src', 'features', 'onboarding-state', 'onboarding-state-adapter.ts'),
      'utf8'
    );
    expect(onboardingStateAdapter).toContain('createSupabaseOnboardingStateAdapter');
    expect(onboardingStateAdapter).toContain('setOnboardingStateUserId(userId)');
    expect(onboardingStateAdapter).toContain('setLegalAcceptanceUserId(userId)');
    const onboardingStateCore = await readFile(
      path.join(projectPath, 'src', 'features', 'onboarding-state', 'onboarding-state-core.ts'),
      'utf8'
    );
    expect(onboardingStateCore).toContain('currentOnboardingUserId');
    expect(onboardingStateCore).toContain('userId: input?.userId ?? currentOnboardingUserId');
    expect(onboardingStateCore).toContain('notifyOnboardingStateChanged(next)');
    const legalAcceptanceAdapter = await readFile(
      path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter.ts'),
      'utf8'
    );
    expect(legalAcceptanceAdapter).toContain('getLegalAcceptanceUserId');
    expect(legalAcceptanceAdapter).toContain('const effectiveUserId = userId ?? getLegalAcceptanceUserId();');
    expect(legalAcceptanceAdapter).toContain('input?.userId ?? effectiveUserId');
    const supabaseOnboardingState = await readFile(
      path.join(
        projectPath,
        'src',
        'features',
        'onboarding-state',
        'onboarding-state-supabase.ts'
      ),
      'utf8'
    );
    expect(supabaseOnboardingState).toContain('const current = createEmptyOnboardingState();');
    expect(supabaseOnboardingState).toContain("current_step: next.currentStep ?? null");
    expect(supabaseOnboardingState).toContain("row?.status === 'complete'");
    expect(supabaseOnboardingState).toContain(
      'acceptance_version: document.acceptanceVersion'
    );
    expect(supabaseOnboardingState).toContain(
      "isMissingColumnError(result.error.message, 'acceptance_version')"
    );
    const onboardingMigration = await readFile(
      path.join(projectPath, 'supabase', 'migrations', '0001_mds_auth_onboarding.sql'),
      'utf8'
    );
    expect(onboardingMigration).toContain('add column if not exists flow_version');
    expect(onboardingMigration).toContain('add column if not exists document_id');
    expect(onboardingMigration).toContain('add column if not exists document_version');
    expect(onboardingMigration).toContain('add column if not exists acceptance_version');
    expect(onboardingMigration).toContain('add column if not exists metadata');
    expect(onboardingMigration).toContain('column_name = \'acceptance_version\'');
    expect(onboardingMigration).toContain('alter column acceptance_version drop not null');
    expect(onboardingMigration).toContain(
      'create unique index if not exists user_legal_acceptances_user_document_version_idx'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.toContain('- Onboarding Persistence: supabase');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'),
        'utf8'
      )
    ).resolves.toContain(
      'Auth handoff selected. Signed-out users are routed to sign in by the protected app layout.'
    );
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'),
        'utf8'
      )
    ).resolves.toContain("route: '/' as Href");
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain('const auth = useAuthAdapter();');
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain("legalUrls={{ terms: '/terms', privacy: '/privacy' }}");
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'auth', 'auth-types.ts'), 'utf8')
    ).resolves.toContain('refreshSession(): Promise<void>;');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'auth', 'auth-guard.tsx'), 'utf8')
    ).resolves.toContain('Checking session...');
  });

  it('personalizes public legal documents and settings links for base auth account setup', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-settings-legal-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'settings-legal-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'Settings Legal App',
      authProvider: 'base',
      legalDocumentMode: 'public-routes',
      onboardingCompletionMode: 'account-setup',
      legalBusinessName: 'Settings Legal LLC',
      legalContactEmail: 'privacy@settings-legal.test',
      legalAddressOrRegionNote: 'Brooklyn, NY, USA',
    });

    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain('const auth = useAuthAdapter();');
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain("legalUrls={{ terms: '/terms', privacy: '/privacy' }}");
    await expect(
      readFile(path.join(projectPath, 'app', 'settings.tsx'), 'utf8')
    ).resolves.toContain('profileHref="/account-setup"');
    await expect(
      readFile(path.join(projectPath, 'app', 'terms.tsx'), 'utf8')
    ).resolves.toContain('legal-page-route');
    await expect(
      readFile(path.join(projectPath, 'app', 'privacy.tsx'), 'utf8')
    ).resolves.toContain('legal-page-route');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
        'utf8'
      )
    ).resolves.toContain('Settings Legal LLC');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
        'utf8'
      )
    ).resolves.toContain('privacy@settings-legal.test');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
        'utf8'
      )
    ).resolves.toContain('Brooklyn, NY, USA');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
        'utf8'
      )
    ).resolves.toContain('GDPR');
  });

  it('does not generate legal-gated routes when Supabase auth is selected without legal options', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-auth-no-legal-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'auth-no-legal-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'Auth No Legal App',
      authProvider: 'supabase',
      onboardingCompletionMode: 'auth',
      legalDocumentMode: 'none',
      legalUpdateGate: 'none',
    });

    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '- Legal Documents: none'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '- Legal Update Gate: none'
    );
    const rootLayout = await readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8');
    expect(rootLayout).toContain('const onboardingIsReady = !onboarding.isLoading;');
    expect(rootLayout).toContain(
      '<Stack.Protected guard={auth.isAuthenticated && !onboardingComplete}>'
    );
    expect(rootLayout).toContain(
      '<Stack.Protected guard={auth.isAuthenticated && onboardingComplete}>'
    );
    expect(rootLayout).toContain('useOnboardingState(auth.user?.id)');
    expect(rootLayout).not.toContain('legalGateStatus');
    expect(rootLayout).not.toContain('useLegalUpdateGateStatus');
    expect(rootLayout).not.toContain('<Stack.Screen name="legal/updates"');
    expect(rootLayout).not.toContain('<Stack.Screen name="terms"');
    expect(rootLayout).not.toContain('<Stack.Screen name="privacy"');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'),
        'utf8'
      )
    ).resolves.toContain("route: '/' as Href");
    await expect(
      readFile(path.join(projectPath, 'app', 'legal', 'updates.tsx'), 'utf8')
    ).rejects.toThrow();
  });

  it('preserves an existing Supabase .env.local during forced regeneration', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-auth-env-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'auth-env-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, '.env.local'),
      [
        'EXPO_PUBLIC_SUPABASE_URL=https://existing.supabase.co',
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=existing',
        'EXPO_PUBLIC_SUPABASE_KEY=existing',
        '',
      ].join('\n'),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      force: true,
      noInstall: true,
      appName: 'Auth Env App',
      authProvider: 'supabase',
      supabaseUrl: 'https://replacement.supabase.co',
      supabasePublishableKey: 'sb_publishable_replacement',
    });

    await expect(readFile(path.join(projectPath, '.env.local'), 'utf8')).resolves.toBe(
      [
        'EXPO_PUBLIC_SUPABASE_URL=https://existing.supabase.co',
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=existing',
        'EXPO_PUBLIC_SUPABASE_KEY=existing',
        '',
      ].join('\n')
    );
    await expect(readFile(path.join(projectPath, '.gitignore'), 'utf8')).resolves.toContain(
      '.env.local'
    );
  });

  it('generates a legal update gate route and protected app layout when selected', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-legal-gate-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'legal-gate-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'Legal Gate App',
      legalDocumentMode: 'none',
      legalUpdateGate: 'material-required',
    });

    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '- Legal Documents: onboarding-agreement'
    );
    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      '- Legal Update Gate: material-required'
    );
    await expect(
      readFile(path.join(projectPath, 'app', 'onboarding', 'legal.tsx'), 'utf8')
    ).resolves.toContain('legal-review-screen');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter.ts'),
        'utf8'
      )
    ).resolves.toContain('LegalAcceptanceAdapter');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-update-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Review required document updates');
    const rootLayout = await readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8');
    expect(rootLayout).toContain(
      "import { useLegalUpdateGateStatus } from '../src/features/legal/legal-acceptance-adapter';"
    );
    expect(rootLayout).toContain('<Stack.Screen name="legal/updates"');
    expect(rootLayout).toContain('<Stack.Screen name="onboarding/legal"');
    expect(rootLayout).not.toContain('<Stack.Screen name="onboarding/complete"');
    expect(rootLayout).toContain('<Stack.Protected guard={!onboardingComplete}>');
    expect(rootLayout).toContain(
      '<Stack.Protected guard={onboardingComplete && legalGateStatus === "complete"}>'
    );
    expect(rootLayout).toContain('<Stack.Screen name="settings"');
  });

  it('generates a memory onboarding adapter for local-only apps and a compile-ready legal review', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-persist-local-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'persist-local-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Persist Local App',
      legalDocumentMode: 'onboarding-agreement',
      noInstall: true,
    });

    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.toContain('- Onboarding Persistence: memory');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding-state', 'onboarding-state-adapter.ts'),
        'utf8'
      )
    ).resolves.toContain('createMemoryOnboardingPersistence');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'legal-review-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('legal-acceptance-adapter');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'onboarding', 'legal-review-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('Completing...');
    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter.ts'),
        'utf8'
      )
    ).resolves.toContain('LegalAcceptanceAdapter');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'), 'utf8')
    ).rejects.toThrow();
    await expect(
      readFile(path.join(projectPath, 'supabase', 'migrations', '0001_mds_auth_onboarding.sql'), 'utf8')
    ).rejects.toThrow();
    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> };
    expect(packageJson.dependencies.zustand).toBeUndefined();
    expect(packageJson.dependencies['@supabase/supabase-js']).toBeUndefined();
  });

  it('generates zustand-local persistence without supabase imports in onboarding files', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-persist-zustand-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'persist-zustand-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Persist Zustand App',
      generatorStateManagement: 'zustand',
      noInstall: true,
    });

    const adapter = await readFile(
      path.join(projectPath, 'src', 'features', 'onboarding-state', 'onboarding-state-adapter.ts'),
      'utf8'
    );
    const completeScreen = await readFile(
      path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'),
      'utf8'
    );
    expect(adapter).toContain('createZustandOnboardingStateAdapter');
    expect(adapter).not.toContain('@supabase/supabase-js');
    expect(completeScreen).toContain('markOnboardingComplete');
    expect(completeScreen).toContain('completionError');
    expect(completeScreen).not.toContain('@supabase/supabase-js');
    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> };
    expect(packageJson.dependencies.zustand).toBe('^5.0.8');
    await expect(
      readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')
    ).resolves.toContain('- Onboarding Persistence: zustand-local');
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
      noInstall: true,
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
      'name="exposition/nativewindui"'
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8')
    ).resolves.toContain("href: '/exposition/nativewindui'");
    await expect(
      readFile(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ActivityIndicator.tsx'),
        'utf8'
      )
    ).resolves.toContain('useColorScheme');
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
    ).resolves.toContain('LayoutAnimationConfig');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'), 'utf8')
    ).resolves.toContain('buttonVariants');
  });

  it('keeps NativeWindUI primitives for React Navigation without generating Expo Router routes', async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), 'mds-onboard-nativewindui-react-nav-')
    );
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'nativewindui-react-nav-app',
        scripts: {},
        dependencies: {
          '@react-navigation/native': '^7.1.21',
        },
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'App.tsx'),
      "import 'react-navigation';\nexport default function App() { return null; }\n",
      'utf8'
    );

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'NativeWindUI React Nav App',
      defaults: 'project-docs,uniwind,nativewindui',
    });

    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('NativeWindUI Exposition');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'), 'utf8')
    ).resolves.toContain('buttonVariants');
    await expect(
      access(path.join(projectPath, 'app', 'exposition', 'nativewindui.tsx'))
    ).rejects.toThrow();
  });

  it.each([
    { manageUniwind: true, label: 'mds-managed' },
    { manageUniwind: false, label: 'cess-owned' },
  ])(
    'generates no Uniwind/Tailwind/NativeWind artifacts when stylesheet is selected ($label)',
    async ({ manageUniwind }) => {
      const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-stylesheet-'));
      tempDirs.push(projectPath);
      await mkdir(path.join(projectPath, 'app'), { recursive: true });
      await writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify({
          name: 'stylesheet-app',
          scripts: {},
          dependencies: {},
          devDependencies: {},
        }),
        'utf8'
      );

      const answers = sampleAnswers('Stylesheet App');
      answers.generatorStylingSystem = 'stylesheet';
      answers.defaults = ['project-docs', 'guidelines', 'uniwind', 'nativewindui', 'doctor'];
      await scaffoldProjectMemory(projectPath, answers, {
        richBoilerplate: true,
        manageUniwind,
      });

      const packageJson = JSON.parse(
        await readFile(path.join(projectPath, 'package.json'), 'utf8')
      ) as {
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(packageJson.dependencies.uniwind).toBeUndefined();
      expect(packageJson.dependencies.nativewind).toBeUndefined();
      expect(packageJson.dependencies['@roninoss/nativewindui']).toBeUndefined();
      expect(packageJson.devDependencies.tailwindcss).toBeUndefined();
      expect(packageJson.devDependencies['prettier-plugin-tailwindcss']).toBeUndefined();
      expect(packageJson.scripts['patch:nativewind-metro']).toBeUndefined();
      expect(packageJson.scripts.prestart).toBeUndefined();
      expect(packageJson.scripts.preandroid).toBeUndefined();
      expect(packageJson.scripts.preweb).toBeUndefined();
      expect(packageJson.scripts.postinstall).toBeUndefined();

      await expect(access(path.join(projectPath, 'global.css'))).rejects.toThrow();
      await expect(access(path.join(projectPath, 'nativewind-env.d.ts'))).rejects.toThrow();
      await expect(access(path.join(projectPath, 'tailwind.config.js'))).rejects.toThrow();
      await expect(access(path.join(projectPath, 'uniwind-types.d.ts'))).rejects.toThrow();
      await expect(
        access(path.join(projectPath, 'scripts', 'patch-nativewind-metro.cjs'))
      ).rejects.toThrow();
      await expect(
        access(path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'))
      ).rejects.toThrow();
      await expect(
        access(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'))
      ).rejects.toThrow();
      await expect(
        access(path.join(projectPath, 'app', 'exposition', 'nativewindui.tsx'))
      ).rejects.toThrow();

      const homeScreen = await readFile(
        path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
        'utf8'
      );
      const expositionScreen = await readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
        'utf8'
      );
      const rootLayout = await readFile(path.join(projectPath, 'app', '_layout.tsx'), 'utf8');
      expect(homeScreen).not.toContain('/exposition/nativewindui');
      expect(homeScreen).not.toContain('className=');
      expect(expositionScreen).not.toContain('/exposition/nativewindui');
      expect(expositionScreen).not.toContain('className=');
      expect(rootLayout).not.toContain('exposition/nativewindui');
      expect(rootLayout).not.toContain('className=');
      expect(rootLayout).not.toContain('global.css');
    }
  );

  it('generates NativeWindUI artifacts from generatorStylingSystem even without a nativewindui default', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-nativewindui-flag-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'nativewindui-flag-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );

    const answers = sampleAnswers('NativeWindUI Flag App');
    answers.generatorStylingSystem = 'nativewindui';
    answers.defaults = ['project-docs', 'guidelines', 'doctor'];
    await scaffoldProjectMemory(projectPath, answers, {
      richBoilerplate: true,
      manageUniwind: false,
    });

    await expect(
      readFile(
        path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
        'utf8'
      )
    ).resolves.toContain('NativeWindUI Exposition');
    await expect(
      readFile(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'), 'utf8')
    ).resolves.toContain('buttonVariants');
    await expect(
      readFile(path.join(projectPath, 'app', 'exposition', 'nativewindui.tsx'), 'utf8')
    ).resolves.toContain('nativewindui-screen');
  });

  it('installs newly declared packages by default and validates their presence', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-install-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'install-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await mkdir(path.join(projectPath, 'app'), { recursive: true });

    const installRunner = vi.fn(async (_command, _args, options) => {
      const packageJson = JSON.parse(
        await readFile(path.join(options.cwd, 'package.json'), 'utf8')
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const names = [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ];
      for (const name of names) {
        await mkdir(path.join(options.cwd, 'node_modules', ...name.split('/')), { recursive: true });
      }
    });

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Install App',
      defaults: 'project-docs,uniwind,doctor',
      installRunner,
    });

    expect(installRunner).toHaveBeenCalledTimes(1);
    expect(installRunner.mock.calls[0]?.[0]).toBe('npm');
    expect(installRunner.mock.calls[0]?.[1]).toEqual(['install']);
    await expect(access(path.join(projectPath, 'node_modules', 'uniwind'))).resolves.toBeUndefined();
  });

  it('skips install when --no-install is set and prints the pending command instead', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-no-install-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'no-install-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    const installRunner = vi.fn();

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      noInstall: true,
      appName: 'No Install App',
      defaults: 'project-docs,uniwind,doctor',
      installRunner,
    });

    expect(installRunner).not.toHaveBeenCalled();
    await expect(access(path.join(projectPath, 'node_modules'))).rejects.toThrow();
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

  it('resolves Supabase local environment defaults, overrides, and validation', () => {
    expect(resolveSupabaseLocalEnvironment({}, false)).toBeUndefined();
    expect(resolveSupabaseLocalEnvironment({})).toEqual({
      url: 'https://bvzekjnvpkbcdobccffn.supabase.co',
      publishableKey: 'sb_publishable__NjNz5Lsu6MhXgqdpWOihQ_yxKo22M-',
    });
    expect(
      resolveSupabaseLocalEnvironment({
        supabaseUrl: 'https://project.supabase.co',
        supabasePublishableKey: 'sb_publishable_project',
      })
    ).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_project',
    });
    expect(() =>
      resolveSupabaseLocalEnvironment({
        supabaseUrl: 'https://project.supabase.co',
      })
    ).toThrow('requires both');
    expect(() =>
      resolveSupabaseLocalEnvironment({
        supabaseUrl: 'not-a-url',
        supabasePublishableKey: 'sb_publishable_project',
      })
    ).toThrow('valid http or https URL');
    expect(() =>
      resolveSupabaseLocalEnvironment({
        supabaseUrl: 'https://project.supabase.co',
        supabasePublishableKey: 'bad key',
      })
    ).toThrow('without whitespace');
  });

  it('persists a pending Phase 0 component strategy by default', () => {
    const plan = defaultOnboardPlan({
      project: path.join(os.tmpdir(), 'strategy-app'),
      generatorStylingSystem: 'uniwind',
      expoUi: true,
      expoUiUniversal: true,
      expoNativeTabs: true,
    });
    const info = renderInfo(plan.answers.appName, plan.answers);
    const todo = renderTodo(plan.answers);

    expect(plan.answers.componentStrategyDecision).toBe('pending');
    expect(info).toContain('## Component Strategy');
    expect(info).toContain('- Style Library: Uniwind');
    expect(info).toContain('- Decision: pending');
    expect(todo).toContain('Confirm the Phase 0 component strategy in `project/info.md`');
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
    expect(deriveDefaults(undefined, ['project-docs'], 'local', false, 'convex')).toEqual([
      'project-docs',
      'guidelines',
      'doctor',
      'convex',
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

  it('normalizes saved legal gate defaults to legal review inside onboarding', async () => {
    const defaultsPath = path.join(os.tmpdir(), 'mds-onboard-legacy-legal-defaults.json');
    const previousPath = process.env.MDS_ONBOARD_DEFAULTS_PATH;
    const previousDisable = process.env.MDS_DISABLE_PERSONAL_DEFAULTS;
    const previousVitest = process.env.VITEST;
    const previousVitestWorker = process.env.VITEST_WORKER_ID;

    try {
      process.env.MDS_ONBOARD_DEFAULTS_PATH = defaultsPath;
      delete process.env.MDS_DISABLE_PERSONAL_DEFAULTS;
      delete process.env.VITEST;
      delete process.env.VITEST_WORKER_ID;
      await writeFile(
        defaultsPath,
        JSON.stringify({
          onboardingFlow: 'multi-screen',
          legalDocumentMode: 'public-routes',
          legalUpdateGate: 'material-required',
        }),
        'utf8'
      );

      const plan = defaultOnboardPlan({
        project: path.join(os.tmpdir(), 'legacy-legal-defaults-app'),
      });
      expect(plan.answers.onboardingFlow).toBe('multi-screen');
      expect(plan.answers.legalDocumentMode).toBe('onboarding-agreement');
      expect(plan.answers.legalUpdateGate).toBe('material-required');
    } finally {
      await rm(defaultsPath, { force: true });
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

      const savedPath = savePersonalOnboardDefaults({
        ...sampleAnswers('Defaults App'),
        legalBusinessName: 'Defaults Legal LLC',
        legalContactEmail: 'privacy@defaults.test',
        legalAddressOrRegionNote: 'Queens, NY, USA',
      });
      expect(savedPath).toBe(defaultsPath);
      await expect(readFile(defaultsPath, 'utf8')).resolves.toContain('"defaults"');
      await expect(readFile(defaultsPath, 'utf8')).resolves.toContain('"legalBusinessName"');
      await expect(readFile(defaultsPath, 'utf8')).resolves.toContain('"legalContactEmail"');
      await expect(readFile(defaultsPath, 'utf8')).resolves.toContain(
        '"legalAddressOrRegionNote"'
      );
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
          authProvider: 'convex',
          legalBusinessName: 'Saved Defaults LLC',
          legalContactEmail: 'legal@saved-defaults.test',
          legalAddressOrRegionNote: 'Remote-friendly; US East',
          onboardingFlow: 'multi-screen',
          legalDocumentMode: 'public-routes',
          onboardingCompletionMode: 'auth',
          legalUpdateGate: 'none',
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
        authProvider: 'convex',
        legalBusinessName: 'Saved Defaults LLC',
        legalContactEmail: 'legal@saved-defaults.test',
        legalAddressOrRegionNote: 'Remote-friendly; US East',
        onboardingFlow: 'multi-screen',
        legalDocumentMode: 'public-routes',
        onboardingCompletionMode: 'auth',
        legalUpdateGate: 'none',
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

  it('does not replace an existing TODO ledger, even when onboarding is forced', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-onboard-preserve-todo-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    const originalTodo = [
      '# Human roadmap',
      '',
      '- [x] Historical delivery.',
      '  - Completion: [PR #11](https://github.com/DavidJGrimsley/mrdj-dev-suite/pull/11)',
      '- [ ] Human-approved next task.',
      '',
    ].join('\n');
    await writeFile(path.join(projectPath, 'project', 'todo.md'), originalTodo, 'utf8');

    await scaffoldProjectMemory(projectPath, sampleAnswers('Preserve Todo'), {
      force: true,
      richBoilerplate: false,
      manageUniwind: false,
    });

    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toBe(originalTodo);
  });
});

describe('normalizePromptText', () => {
  it('returns an empty string for undefined optional prompt answers', () => {
    expect(normalizePromptText(undefined)).toBe('');
  });

  it('trims string prompt answers', () => {
    expect(normalizePromptText('  Home, settings  ')).toBe('Home, settings');
  });

  it('derives onboarding persistence from the existing stack instead of a new prompt', () => {
    expect(deriveOnboardingPersistence(sampleAnswers('Local'))).toBe('memory');
    expect(
      deriveOnboardingPersistence({
        ...sampleAnswers('Zustand'),
        generatorStateManagement: 'zustand',
      })
    ).toBe('zustand-local');
    expect(
      deriveOnboardingPersistence({
        ...sampleAnswers('Supabase'),
        authProvider: 'supabase',
      })
    ).toBe('supabase');
    expect(
      deriveOnboardingPersistence({
        ...sampleAnswers('Both'),
        authProvider: 'supabase',
        generatorStateManagement: 'zustand',
      })
    ).toBe('zustand-supabase');
    expect(
      deriveOnboardingPersistence({
        ...sampleAnswers('Firebase'),
        authProvider: 'firebase',
        generatorStateManagement: 'zustand',
      })
    ).toBe('zustand-local');
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
    onboardingFlow: 'multi-screen',
    legalDocumentMode: 'none',
    onboardingCompletionMode: 'enter-app',
    legalUpdateGate: 'none',
    testToMainSafeguards: true,
    defaults: ['project-docs', 'guidelines', 'uniwind', 'doctor'],
  };
}
