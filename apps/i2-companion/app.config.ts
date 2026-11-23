import type { ConfigContext, ExpoConfig } from 'expo/config';

// Permissions unused by the fully virtual Quest workspace. Phone builds retain standard behavior.
export const QUEST_BLOCKED_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.NFC',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'horizonos.permission.USE_ANCHOR_API',
  'com.oculus.permission.USE_SCENE',
  'com.oculus.permission.BOUNDARY_VISIBILITY',
  'horizonos.permission.HAND_TRACKING',
  'horizonos.permission.HEADSET_CAMERA',
  'horizonos.permission.IMPORT_EXPORT_IOT_MAP_DATA',
];

export function isQuestBuild(env: Record<string, string | undefined> = process.env): boolean {
  return env.QUEST_BUILD === '1';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const quest = isQuestBuild();
  const questAppId = process.env.META_QUEST_APP_ID?.trim();
  if (quest && questAppId && !/^\d+$/.test(questAppId)) {
    throw new Error('META_QUEST_APP_ID must be a numeric Meta Quest application ID.');
  }

  const basePlugins = (config.plugins ?? []).filter(
    (plugin) => !(Array.isArray(plugin) && plugin[0] === '@reactvision/react-viro')
  );

  const viroPlugin: [string, Record<string, unknown>] = [
    '@reactvision/react-viro',
    {
      provider: 'none',
      ...(quest
        ? {
            android: {
              xRMode: ['QUEST'],
              questSupportedDevices: 'quest3|quest3s',
              questFeatures: {
                colocation: false,
                eyeTracking: false,
                passthroughCamera: false,
              },
              ...(questAppId ? { questAppId } : {}),
            },
          }
        : {}),
    },
  ];

  return {
    ...config,
    name: config.name ?? 'i2 Companion',
    slug: config.slug ?? 'i2-companion',
    orientation: quest ? 'landscape' : 'default',
    plugins: [
      'expo-asset',
      ...basePlugins,
      viroPlugin,
      ...(quest
        ? [
            './tools/quest/with-quest-vr-activity.cjs',
            './tools/quest/with-quest-viro-renderer.cjs',
            './tools/quest/with-quest-home-proof.cjs',
          ]
        : []),
    ],
    ...(quest
      ? {
          android: {
            ...config.android,
            blockedPermissions: [
              ...(config.android?.blockedPermissions ?? []),
              ...QUEST_BLOCKED_PERMISSIONS,
            ],
          },
        }
      : {}),
  };
};
