import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  companionStore,
  useCompanionStore,
  type CompanionRouteName,
} from '../../stores/companion-store';
import { useConnectionStore } from '../../stores/connection-store';
import { layoutStore, useLayoutStore } from '../../stores/layout-store';
import { TutorialOverlay } from '../tutorials/TutorialOverlay';
import { ConnectionModeModal } from '../widgets/ConnectionModeModal';
import { LearnModal } from '../widgets/LearnModal';
import { PrototypeLimitModal } from '../widgets/PrototypeLimitModal';
import { WidgetDock } from '../widgets/WidgetDock';
import { WidgetsGalleryModal } from '../widgets/WidgetsGalleryModal';

const ROUTES: { id: CompanionRouteName; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'project', label: 'Project' },
  { id: 'session', label: 'Session' },
  { id: 'emulators', label: 'Emulators' },
];

export function CompanionShell() {
  const { width } = useWindowDimensions();
  const route = useCompanionStore((s) => s.route);
  const session = useCompanionStore((s) => s.session);
  const environmentName = useCompanionStore((s) => s.environmentName);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const activeSessionId = useCompanionStore((s) => s.activeSessionId);
  const projects = useCompanionStore((s) => s.projects);
  const sessions = useCompanionStore((s) => s.sessions);
  const notifications = useCompanionStore((s) => s.notifications);
  const storageBackendLabel = useCompanionStore((s) => s.storageBackendLabel);
  const crossOriginIsolated = useCompanionStore((s) => s.crossOriginIsolated);

  const presets = useLayoutStore((s) => s.presets);
  const activePresetId = useLayoutStore(
    (s) => s.activePresetByScope[s.currentScope] ?? 'minimal-infie-emu'
  );
  const connectionStatus = useConnectionStore((s) => s.status);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const compact = width < 760;
  const activeProj = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSess = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  return (
    <View className="flex-1 bg-slate-950">
      <View className="border-b border-slate-800 bg-slate-900/95 px-3 py-2.5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-extrabold tracking-tight text-teal-300">
              i² Companion
            </Text>
            <Pressable
              onPress={() => setConnOpen(true)}
              className="rounded-full border border-teal-500/40 bg-teal-950/60 px-2.5 py-0.5">
              <Text className="text-[11px] font-semibold text-teal-200">
                {connectionStatus.hostLabel}
              </Text>
            </Pressable>
            {unreadCount > 0 ? (
              <View className="rounded-full bg-amber-500/20 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-amber-300">{unreadCount} alert</Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row flex-wrap items-center gap-1.5">
            {ROUTES.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => companionStore.getState().setRoute(r.id)}
                className={`rounded-lg px-2.5 py-1 ${
                  route === r.id ? 'bg-teal-500' : 'bg-slate-800'
                }`}>
                <Text
                  className={`text-xs font-semibold ${
                    route === r.id ? 'text-slate-950' : 'text-slate-200'
                  }`}>
                  {r.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setGalleryOpen(true)}
              className="rounded-lg border border-teal-500/40 bg-slate-800 px-2.5 py-1">
              <Text className="text-xs font-semibold text-teal-200">Widgets</Text>
            </Pressable>

            <Pressable
              onPress={() => setLearnOpen(true)}
              className="rounded-lg bg-slate-800 px-2.5 py-1">
              <Text className="text-xs font-semibold text-slate-200">
                Learn · Lv {session?.level ?? 1}
              </Text>
            </Pressable>

            {Platform.OS !== 'web' ? (
              <Link href="/vr" asChild>
                <Pressable className="rounded-lg bg-indigo-500 px-2.5 py-1">
                  <Text className="text-xs font-bold text-white">VR Cockpit</Text>
                </Pressable>
              </Link>
            ) : null}

            <Link href="/settings" asChild>
              <Pressable className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1">
                <Text className="text-xs font-semibold text-slate-200">Settings</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="mt-1.5 flex-row flex-wrap items-center justify-between gap-2">
          <Text className="text-[11px] text-slate-400">
            Env: <Text className="font-semibold text-teal-200">{environmentName}</Text> · Route:{' '}
            <Text className="font-semibold text-slate-200">{route}</Text> · {activeProj?.name} /{' '}
            {activeSess?.name} [{activeSess?.status}]
          </Text>
          <Text className="text-[10px] font-semibold text-amber-300">
            Simulated Local State · No Cross-Device Sync
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2 flex-row"
          contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
          <Text className="text-[11px] font-semibold text-slate-400">Layout:</Text>
          {presets.map((p) => {
            const active = p.presetId === activePresetId;
            return (
              <Pressable
                key={p.presetId}
                onPress={() => void layoutStore.getState().switchPreset(p.presetId)}
                className={`rounded-full px-2.5 py-1 ${
                  active
                    ? 'bg-teal-500/25 border border-teal-400'
                    : 'bg-slate-800/80 border border-slate-700'
                }`}>
                <Text
                  className={`text-[11px] font-medium ${
                    active ? 'text-teal-200' : 'text-slate-300'
                  }`}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
          {!compact ? (
            <Text className="ml-2 text-[10px] text-slate-500">
              DB: {storageBackendLabel}
              {Platform.OS === 'web' ? ` · COOP/COEP=${String(crossOriginIsolated)}` : ''}
            </Text>
          ) : null}
        </ScrollView>
      </View>

      <TutorialOverlay />

      <View className="flex-1 p-3">
        <WidgetDock onOpenGallery={() => setGalleryOpen(true)} />
      </View>

      <PrototypeLimitModal />
      <WidgetsGalleryModal visible={galleryOpen} onClose={() => setGalleryOpen(false)} />
      <LearnModal visible={learnOpen} onClose={() => setLearnOpen(false)} />
      <ConnectionModeModal visible={connOpen} onClose={() => setConnOpen(false)} />
    </View>
  );
}
