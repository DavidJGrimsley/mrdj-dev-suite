import { VRQuestNavigatorBridge, ViroXRSceneNavigator } from '@reactvision/react-viro';
import React, { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import {
  AppState,
  BackHandler,
  DeviceEventEmitter,
  NativeModules,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useCompanionStore } from '../../stores/companion-store';
import { questRuntime, type QuestVRActivityState } from '../../stores/quest-runtime-store';
import { resolveQuestLauncherCopy } from './quest-entry-logic';
import QuestCockpitScene from './QuestCockpitScene.native';

const VR_INITIAL_SCENE = { scene: QuestCockpitScene };
const VR_ACTIVITY_STATES = new Set<QuestVRActivityState>([
  'unknown',
  'resumed',
  'paused',
  'stopped',
  'finishing',
  'destroyed',
]);

export function QuestCompanionScreen() {
  const session = useCompanionStore((s) => s.session);
  const snapshot = useSyncExternalStore(questRuntime.subscribe, questRuntime.getSnapshot);
  const [attempt, setAttempt] = useState(0);
  const [panelMountKey, setPanelMountKey] = useState(0);

  useEffect(() => {
    const sub = DeviceEventEmitter?.addListener?.(
      'questVRActivityState',
      (event: { state?: unknown; finishing?: unknown } | null | undefined) => {
        const next =
          typeof event?.state === 'string' &&
          VR_ACTIVITY_STATES.has(event.state as QuestVRActivityState)
            ? (event.state as QuestVRActivityState)
            : 'unknown';
        questRuntime.vrActivityStateChanged(next, Boolean(event?.finishing));
        if (next !== 'resumed') {
          setPanelMountKey((k) => k + 1);
        }
      }
    );
    const appSub = AppState?.addEventListener?.('change', (state) => {
      questRuntime.appStateChanged(state === 'active');
      if (state === 'active') {
        setPanelMountKey((k) => k + 1);
      }
    });
    const errSub = VRQuestNavigatorBridge?.onQuestError?.((err) => {
      questRuntime.fail(typeof err === 'string' ? err : String(err));
    });
    return () => {
      sub?.remove?.();
      appSub?.remove?.();
      if (typeof errSub === 'function') errSub();
    };
  }, []);

  useEffect(() => {
    if (snapshot.status !== 'launching') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [snapshot.status]);

  const enter = (launch?: () => void) => {
    if (
      snapshot.status === 'immersive' &&
      snapshot.vrActivityState !== 'finishing' &&
      snapshot.vrActivityState !== 'destroyed'
    ) {
      return (launch ?? NativeModules.VRLauncher?.launchVRScene)?.();
    }
    const remount = !launch || snapshot.status === 'error';
    if (!questRuntime.requestEnter()) return;
    if (remount) setAttempt((v) => v + 1);
    else launch();
  };

  const renderLauncher = (launch?: () => void) => {
    const copy = resolveQuestLauncherCopy(snapshot.status, snapshot.entries > 0);
    const isLaunching = snapshot.status === 'launching';

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0a0814' }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}>
        <View
          key={panelMountKey}
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: '#0b131d',
            borderColor: 'rgba(171, 239, 163, 0.24)',
            borderWidth: 1,
            borderRadius: 20,
            padding: 28,
            alignItems: 'center',
            gap: 18,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#abefa3',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 10,
            }}>
            <Text
              style={{
                color: '#061413',
                fontSize: 18,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
              }}>
              ∞ i²
            </Text>
          </View>

          <Text
            style={{
              color: '#f8fafc',
              fontSize: 24,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk-Bold',
              textAlign: 'center',
            }}>
            {session ? `Welcome back, ${session.displayName}` : 'i² Spatial Workspace'}
          </Text>

          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.72)',
              fontSize: 14,
              lineHeight: 20,
              fontFamily: 'RoundedMplus1c-Regular',
              textAlign: 'center',
            }}>
            {copy.subtitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.ctaLabel}
            disabled={isLaunching}
            onPress={() => enter(launch)}
            style={{
              width: '100%',
              marginTop: 4,
              borderRadius: 12,
              backgroundColor: isLaunching ? 'rgba(45, 212, 191, 0.45)' : '#2dd4bf',
              paddingVertical: 15,
              paddingHorizontal: 20,
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: '#061413',
                fontSize: 16,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
              }}>
              {copy.ctaLabel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  if (attempt === 0) return renderLauncher();
  return (
    <Suspense fallback={renderLauncher()}>
      <ViroXRSceneNavigator
        key={`vr-session-${attempt}`}
        initialScene={VR_INITIAL_SCENE}
        worldAlignment="Gravity"
        autofocus
        onExitViro={() => questRuntime.vrActivityStateChanged('paused', false)}
        renderQuestPanel={renderLauncher}
      />
    </Suspense>
  );
}
