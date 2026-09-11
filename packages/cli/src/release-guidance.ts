export const RELEASE_GUIDANCE_PLATFORMS = ['ios', 'android', 'apple-tv', 'android-tv'] as const;

export type ReleaseGuidancePlatform = (typeof RELEASE_GUIDANCE_PLATFORMS)[number];

const PLATFORM_ALIASES: Record<string, ReleaseGuidancePlatform | undefined> = {
  ios: 'ios',
  iphone: 'ios',
  ipad: 'ios',
  android: 'android',
  'apple-tv': 'apple-tv',
  'apple tv': 'apple-tv',
  tvos: 'apple-tv',
  'android-tv': 'android-tv',
  'android tv': 'android-tv',
};

const PLATFORM_LABELS: Record<ReleaseGuidancePlatform, string> = {
  ios: 'iOS',
  android: 'Android',
  'apple-tv': 'Apple TV (tvOS)',
  'android-tv': 'Android TV',
};

export function selectReleaseGuidancePlatforms(
  targetPlatforms: readonly string[] | undefined
): ReleaseGuidancePlatform[] {
  const selected = new Set(
    (targetPlatforms ?? [])
      .map((platform) => PLATFORM_ALIASES[normalizePlatform(platform)])
      .filter((platform): platform is ReleaseGuidancePlatform => Boolean(platform))
  );

  return RELEASE_GUIDANCE_PLATFORMS.filter((platform) => selected.has(platform));
}

export function hasReleaseGuidance(targetPlatforms: readonly string[] | undefined): boolean {
  return selectReleaseGuidancePlatforms(targetPlatforms).length > 0;
}

export function releaseGuidanceTasks(targetPlatforms: readonly string[] | undefined): string[] {
  const platforms = selectReleaseGuidancePlatforms(targetPlatforms);
  if (platforms.length === 0) {
    return [];
  }

  const labels = platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ');
  const tasks = [
    `[Blocked prerequisite] Enroll in the required developer and store programs and create or confirm app records for: ${labels}.`,
    '[Blocked prerequisite] Configure safe release credentials for local and CI use: EAS access, Apple App Store Connect API access, Google Play service-account access, and repository secrets as applicable.',
    '[Blocked prerequisite] Prepare store metadata and compliance inputs: public app name, screenshots, support and privacy URLs, age or content ratings, data-safety answers, export-compliance answers, and review instructions.',
    'Create production builds with the correct platform identifiers, version numbers, signing configuration, and environment values, then verify each artifact on its target device.',
  ];

  if (platforms.includes('ios')) {
    tasks.push(
      'Complete iOS App Store Connect setup, internal and external TestFlight testing, and production App Review submission.'
    );
  }
  if (platforms.includes('android')) {
    tasks.push(
      'Complete Google Play Console setup, Android internal testing, policy declarations, and production release submission.'
    );
  }
  if (platforms.includes('apple-tv')) {
    tasks.push(
      'Complete tvOS App Store Connect and TestFlight setup, TV-specific asset and device validation, and production App Review submission.'
    );
  }
  if (platforms.includes('android-tv')) {
    tasks.push(
      'Enable Android TV distribution in Google Play, provide TV assets, pass TV quality checks, and submit the production release for review.'
    );
  }

  tasks.push(
    'Use the troubleshooting section in `project/release-flow.md` to resolve build, signing, processing, tester, policy, or review blockers before retrying a release.'
  );
  return tasks;
}

export function renderStoreReleaseGuidance(
  appName: string,
  targetPlatforms: readonly string[] | undefined
): string {
  const platforms = selectReleaseGuidancePlatforms(targetPlatforms);
  if (platforms.length === 0) {
    return '';
  }

  const sections = [
    '## Cross-Platform Store Release Guidance',
    '',
    `This guide is generated for ${appName} because the project targets ${platforms
      .map((platform) => PLATFORM_LABELS[platform])
      .join(
        ', '
      )}. Complete the shared prerequisites, then follow only the platform sections that apply.`,
    '',
    '### Shared prerequisites',
    '',
    '- Join the required developer programs, create the store app records, and reserve the exact bundle ID or package name used by the project.',
    '- Confirm the public app name, support URL, privacy-policy URL, screenshots, descriptions, ratings, content declarations, and review contact or demo-account instructions.',
    '- Decide which environments are development, preview or testing, and production. Keep production secrets out of source control and out of `EXPO_PUBLIC_*` variables.',
    '- Run a production build and test the exact artifact on every selected device target before submitting it for review.',
    '',
    '### EAS and safe credentials',
    '',
    'EAS is the recommended path for repeatable iOS and Android builds and submissions. Sign in locally with `eas login`, configure the project with `eas build:configure`, and keep production settings in the appropriate `eas.json` build and submit profiles.',
    '',
    'For automation, store the EAS project token, App Store Connect API key ID, issuer ID and private key, and Google Play service-account credentials in the CI or EAS secret store. Never commit private keys, service-account JSON, Apple passwords, or copied credential files.',
    '',
    'The separate release-CI task owns workflow generation. This guide only explains the inputs CI will need and the checks that should happen before a branch is promoted.',
    '',
  ];

  if (platforms.includes('ios') || platforms.includes('android')) {
    sections.push('', 'EAS commands for the selected mobile platforms commonly follow this shape:', '', '```bash');
    if (platforms.includes('ios')) {
      sections.push(
        'eas build --platform ios --profile production',
        'eas submit --platform ios --profile production'
      );
    }
    if (platforms.includes('android')) {
      sections.push(
        'eas build --platform android --profile production',
        'eas submit --platform android --profile production'
      );
    }
    sections.push('```');
  }

  if (platforms.includes('apple-tv') || platforms.includes('android-tv')) {
    sections.push(
      '',
      'TV targets may require a native build and submission handoff instead of a direct EAS platform command. Use the TV-specific path required by the selected Expo and platform tooling, and record any manual handoff in this checklist.'
    );
  }

  if (platforms.includes('ios')) {
    sections.push(
      '',
      '### iOS and App Store Connect',
      '',
      '- Enroll in the Apple Developer Program, create the App Store Connect app record, and confirm the bundle ID matches the project configuration.',
      '- Confirm signing, provisioning, version and build numbers, encryption/export-compliance answers, privacy details, and any required review access.',
      '- Upload a build, wait for processing, provide TestFlight beta information, and test with internal testers first.',
      '- For external testers, create a tester group, supply test instructions, and allow the first external build to complete TestFlight review before distributing it.',
      '- Select the tested build, complete store metadata and App Review notes, then submit the version for App Review.',
      '',
      'Official references: [Apple Developer Program](https://developer.apple.com/programs/), [App Store Connect Help](https://developer.apple.com/help/app-store-connect/), [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), and [export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance).'
    );
  }

  if (platforms.includes('android')) {
    sections.push(
      '',
      '### Android and Google Play',
      '',
      '- Create the Play Console app, confirm the package name, accept the required agreements, and configure Play App Signing.',
      '- Build and upload an Android App Bundle, then run an internal test before moving to any broader testing track.',
      '- Complete the store listing, app-content declarations, data-safety form, privacy policy, permissions declarations, and app-access instructions that apply to the app.',
      '- Resolve testing or policy requirements for the developer account, then create and submit the production release for review and rollout.',
      '',
      'Official references: [create and set up an app](https://support.google.com/googleplay/android-developer/answer/9859152), [testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334), [prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348), and [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).'
    );
  }

  if (platforms.includes('apple-tv')) {
    sections.push(
      '',
      '### Apple TV and tvOS',
      '',
      '- Confirm that the project has a tvOS-compatible target, identifier, signing setup, store record, TV screenshots, and a TV-specific test device or simulator path.',
      '- Use the tvOS-native build and upload path when EAS does not support the target directly. Verify the uploaded build in App Store Connect and test it through the tvOS TestFlight flow.',
      '- Complete TV-specific metadata, privacy, export-compliance, review notes, and production App Review submission in App Store Connect.',
      '',
      'Official references: [tvOS](https://developer.apple.com/tvos/), [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview), and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).'
    );
  }

  if (platforms.includes('android-tv')) {
    sections.push(
      '',
      '### Android TV',
      '',
      '- Confirm that the Android app declares the Android TV form factor correctly, supports remote-first navigation, and passes the Android TV quality checklist.',
      '- Provide Android TV screenshots and banner assets, upload the compatible App Bundle, opt in to Android TV in Play Console, and submit the TV distribution for review.',
      '- Decide whether mobile and TV share one package/listing or use separate app records, then keep the selected track and rollout strategy explicit.',
      '',
      'Official references: [distribute to Android TV](https://developer.android.com/training/tv/publishing/distribute), [TV app checklist](https://developer.android.com/training/tv/publishing/checklist), and [create and run a TV app](https://developer.android.com/training/tv/get-started/create).'
    );
  }

  sections.push(
    '',
    '### Common blockers and diagnostic steps',
    '',
    '- **Authentication or credential errors:** confirm the account, organization, project, key IDs, issuer IDs, service-account permissions, and secret names match the target store and environment.',
    '- **Identifier or signing errors:** compare the project bundle ID or package name with the store record, then inspect the build credentials and signing configuration selected by EAS or the native toolchain.',
    '- **Build not visible in the store:** inspect the build and submission logs, confirm processing completed, verify version/build numbers, and check that the uploaded artifact targets the intended platform.',
    '- **Testers cannot install:** verify tester eligibility, tester-group assignment, device/platform support, build availability, beta information, and any pending TestFlight or Play review.',
    '- **Submission blocked:** complete missing metadata, privacy or data-safety declarations, export compliance, permissions forms, age/content ratings, screenshots, and review access instructions.',
    '- **TV review failure:** compare the app against the current TV quality checklist, verify remote navigation and TV assets, and read the store review notice before uploading another build.',
    '',
    'When a release fails, save the relevant build or submission URL, read the first actionable error in the log, fix the underlying configuration or store requirement, and retry only after the corrected artifact has been verified.',
    '',
    '### Official release references',
    '',
    '- [EAS Build](https://docs.expo.dev/build/)',
    '- [EAS Submit configuration](https://docs.expo.dev/submit/eas-json/)',
    '- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)'
  );

  return sections.join('\n');
}

function normalizePlatform(value: string): string {
  return value.trim().toLowerCase().replace(/_/gu, '-').replace(/\s+/gu, ' ');
}
