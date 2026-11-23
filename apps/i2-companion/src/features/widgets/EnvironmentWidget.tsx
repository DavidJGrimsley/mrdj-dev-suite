import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { companionStore, useCompanionStore } from '../../stores/companion-store';
import { connectionStore, useConnectionStore } from '../../stores/connection-store';
import type { SessionStageAction } from '../../types/providers';

function nextActionForStatus(
  status: string,
  allHumanDone: boolean
): { action: SessionStageAction; label: string } | null {
  switch (status) {
    case 'PLAN REVIEW':
      return { action: 'approve-plan', label: 'Approve Plan' };
    case 'WAITING ON TEST':
      return { action: 'test-app', label: 'Test App (Mount v2)' };
    case 'NEEDS YOU':
      return allHumanDone ? { action: 'verify-testing', label: 'Mark Verified' } : null;
    case 'VERIFIED':
      return { action: 'open-pr', label: 'Open Simulated PR' };
    case 'PR OPEN':
      return { action: 'merge-pr', label: 'Simulate Merge' };
    case 'MERGED':
      return { action: 'submit-report', label: 'Submit Report' };
    case 'COMPLETE':
      return { action: 'reset-demo', label: 'Reset Demo Flow' };
    default:
      return null;
  }
}

export function EnvironmentWidgetBody() {
  const environmentId = useCompanionStore((s) => s.environmentId);
  const availableEnvironments = useCompanionStore((s) => s.availableEnvironments);
  const projects = useCompanionStore((s) => s.projects);
  const sessions = useCompanionStore((s) => s.sessions);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const activeSessionId = useCompanionStore((s) => s.activeSessionId);
  const appPreview = useCompanionStore((s) => s.appPreview);
  const recentEvents = useCompanionStore((s) => s.recentEvents);
  const honestStatusNote = useCompanionStore((s) => s.honestStatusNote);
  const connStatus = useConnectionStore((s) => s.status);

  const activeProj = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSess = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const humanDone = activeSess?.humanTests.filter((t) => t.done).length ?? 0;
  const humanTotal = activeSess?.humanTests.length ?? 0;
  const allHumanDone = humanTotal > 0 && humanDone === humanTotal;
  const nextStage = activeSess ? nextActionForStatus(activeSess.status, allHumanDone) : null;

  return (
    <View className="gap-2.5">
      {/* Honest Simulated Shared-State Banner */}
      <View className="rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2">
        <View className="flex-row flex-wrap items-center justify-between gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-amber-400" />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Simulated Environment · Single-Device Only
            </Text>
          </View>
          <Text className="text-[10px] font-semibold text-teal-200">
            Cross-device sync: {String(connStatus.capabilities.crossDeviceSync)}
          </Text>
        </View>
        <Text className="mt-1 text-[11px] leading-4 text-slate-300">{honestStatusNote}</Text>
      </View>

      {/* Environment Selector (Simulated Local + Future Computer/Cloud Boundaries) */}
      <View className="gap-1.5">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Choose Environment
        </Text>
        {availableEnvironments.map((env) => {
          const isActive = env.id === environmentId && env.kind === 'simulated-local';
          return (
            <Pressable
              key={env.id}
              onPress={() => {
                if (env.kind === 'simulated-local') {
                  void companionStore.getState().selectEnvironment(env.id, 'companion-2d');
                } else {
                  connectionStore.getState().setProviderKind(env.kind);
                }
              }}
              className={`rounded-xl border px-3 py-2 ${
                isActive
                  ? 'border-teal-400 bg-teal-950/40'
                  : env.available
                    ? 'border-slate-700 bg-slate-950/70'
                    : 'border-amber-500/30 bg-slate-950/50'
              }`}>
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-teal-200' : env.available ? 'text-slate-100' : 'text-amber-200'
                  }`}>
                  {env.name}
                </Text>
                <Text className="text-[10px] font-semibold text-slate-400">
                  {isActive ? 'ACTIVE' : env.available ? 'Switch' : 'Future Boundary'}
                </Text>
              </View>
              <Text className="mt-0.5 text-[10px] text-slate-400">{env.locationLabel}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Live Shared Workspace Summary & Session Flow Action */}
      <View className="gap-2 rounded-xl border border-teal-500/30 bg-[#0a0814] p-2.5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-1">
            <Text className="text-xs font-bold text-teal-200">
              {activeProj?.name} · {activeSess?.name}
            </Text>
            <Text className="text-[10px] text-slate-400">
              Branch: {activeSess?.branch} · Human Tests: {humanDone}/{humanTotal} · Preview:{' '}
              {appPreview.buildVersion} ({appPreview.sortOrder} first, {appPreview.comments.length}{' '}
              comments)
            </Text>
          </View>
          <Text className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-200">
            {activeSess?.status}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {nextStage ? (
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .advanceSessionStage(activeSess.id, nextStage.action, 'companion-2d')
              }
              className="rounded-lg bg-teal-500 px-2.5 py-1.5">
              <Text className="text-[11px] font-bold text-slate-950">{nextStage.label}</Text>
            </Pressable>
          ) : (
            <View className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5">
              <Text className="text-[11px] text-amber-200">
                Complete remaining Human Testing checks ({humanDone}/{humanTotal}) to verify
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => companionStore.getState().setRoute('session')}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5">
            <Text className="text-[11px] font-semibold text-slate-200">Session View</Text>
          </Pressable>
        </View>
      </View>

      {/* Typed Event Subscription Log */}
      <View className="gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Shared-State Event Log (In-App)
        </Text>
        {recentEvents.slice(0, 4).map((ev) => (
          <Text key={ev.seq} className="font-mono text-[10px] text-slate-300" numberOfLines={1}>
            #{ev.seq} [{ev.origin}] {ev.summary}
          </Text>
        ))}
      </View>
    </View>
  );
}
