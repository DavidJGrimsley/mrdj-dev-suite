import React from 'react';
import { NativeModules, Platform, Text, View } from 'react-native';

import { questPanelAvailable } from '../../modules/quest-panel/src';
import { AuthScreen } from '../features/auth/AuthScreen';
import { CompanionShell } from '../features/companion/CompanionShell';
import { QuestCompanionScreen } from '../features/quest-vr/QuestCompanionScreen';
import { shouldUseQuestDirectEntry } from '../features/quest-vr/quest-entry-logic';
import { useCompanionStore } from '../stores/companion-store';
import { detectDeviceClass } from '../stores/tutorial-store';

export { shouldUseQuestDirectEntry };

export default function IndexScreen() {
  const hydrated = useCompanionStore((s) => s.hydrated);
  const session = useCompanionStore((s) => s.session);

  const isQuestTarget = shouldUseQuestDirectEntry({
    platformOs: Platform.OS,
    deviceClass: detectDeviceClass(),
    hasVrLauncher: Boolean(
      (NativeModules as { VRLauncher?: { launchVRScene?: unknown } } | undefined)?.VRLauncher
        ?.launchVRScene
    ),
    hasQuestPanel: questPanelAvailable(),
  });

  if (isQuestTarget) {
    return <QuestCompanionScreen />;
  }

  if (!hydrated) {
    return (
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: '#0a0814' }}>
        <Text
          className="text-sm font-semibold"
          style={{ color: '#2dd4bf', fontFamily: 'SpaceGrotesk-Medium' }}>
          Loading i² Companion…
        </Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <CompanionShell />;
}
