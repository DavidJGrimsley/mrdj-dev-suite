import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { SEEDED_FILES } from '../../data/seeded-workspace';
import { companionStore, useCompanionStore } from '../../stores/companion-store';
import { connectionStore, useConnectionStore } from '../../stores/connection-store';

export function ExplorerWidgetBody() {
  const projectId = useCompanionStore((s) => s.activeProjectId);
  const files = SEEDED_FILES[projectId] ?? SEEDED_FILES.pet;
  const keys = Object.keys(files);
  const [selected, setSelected] = useState(keys[0] ?? 'Plan.md');
  const resolvedSelected = files[selected] !== undefined ? selected : (keys[0] ?? 'Plan.md');

  return (
    <View className="gap-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1">
        {keys.map((path) => (
          <Pressable
            key={path}
            onPress={() => setSelected(path)}
            className={`mr-1 rounded-md px-2 py-1 ${
              resolvedSelected === path ? 'bg-teal-500' : 'bg-slate-800'
            }`}>
            <Text
              className={`text-[11px] ${resolvedSelected === path ? 'font-bold text-slate-950' : 'text-slate-300'}`}>
              {path.split('/').pop()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView className="max-h-36 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
        <Text className="font-mono text-[11px] text-slate-300">
          {files[resolvedSelected] ?? '// Select a bundled file'}
        </Text>
      </ScrollView>
    </View>
  );
}

export function GitWidgetBody() {
  const sessionId = useCompanionStore((s) => s.activeSessionId);
  const session = useCompanionStore(
    (s) => s.sessions.find((x) => x.id === sessionId) ?? s.sessions[0]
  );
  const [tab, setTab] = useState<'commit' | 'branch'>('commit');
  const diffs = tab === 'commit' ? session.commitDiffs : session.branchDiffs;

  return (
    <View className="gap-2">
      <View className="flex-row gap-1.5">
        {(['commit', 'branch'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`rounded-lg px-2.5 py-1 ${tab === t ? 'bg-teal-500' : 'bg-slate-800'}`}>
            <Text
              className={`text-[11px] font-semibold ${tab === t ? 'text-slate-950' : 'text-slate-200'}`}>
              {t === 'commit' ? 'This Commit' : 'Whole Branch'} ({diffs.length})
            </Text>
          </Pressable>
        ))}
      </View>
      {diffs.map((d) => (
        <View key={d.path} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
          <Text className="text-xs font-semibold text-teal-200">
            [{d.status}] {d.path} <Text className="text-emerald-400">{d.add ?? ''}</Text>{' '}
            <Text className="text-rose-400">{d.del ?? ''}</Text>
          </Text>
          {d.hunk ? (
            <Text className="mt-1 font-mono text-[10px] text-slate-400">{d.hunk}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function TerminalWidgetBody() {
  const mode = useConnectionStore((s) => s.mode);
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState<string[]>([
    '$ npx expo-doctor -> 21/21 checks passed',
    '$ mode: simulated-companion (live PTY requires i2 Core host)',
  ]);

  return (
    <View className="gap-2">
      <ScrollView className="max-h-32 rounded-lg border border-slate-800 bg-black p-2.5">
        {lines.map((line, i) => (
          <Text key={i} className="font-mono text-[11px] text-emerald-300">
            {line}
          </Text>
        ))}
      </ScrollView>
      <View className="flex-row gap-1.5">
        <TextInput
          value={command}
          onChangeText={setCommand}
          placeholder="Run companion command..."
          placeholderTextColor="#64748b"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-100"
        />
        <Pressable
          onPress={() => {
            const cmd = command.trim() || 'status';
            setCommand('');
            if (mode === 'simulated-local') {
              setLines((prev) => [
                ...prev.slice(-8),
                `$ ${cmd}`,
                `[simulated] Live PTY requires a future computer or cloud environment provider.`,
              ]);
              return;
            }
            void connectionStore.getState().requireCapability('terminal', 'Live Terminal PTY');
          }}
          className="justify-center rounded-lg bg-slate-800 px-3">
          <Text className="text-xs font-semibold text-teal-200">Run</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DoctorWidgetBody() {
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const mode = useConnectionStore((s) => s.mode);
  const [checks, setChecks] = useState<{ ok: boolean; msg: string }[]>([
    { ok: true, msg: '21/21 expo-doctor checks passed (simulated snapshot)' },
    { ok: true, msg: 'SQLite PRAGMA user_version = 3 active' },
    { ok: true, msg: 'Mist-intermediary Infie state machine verified' },
  ]);

  useEffect(() => {
    let active = true;
    void connectionStore
      .getState()
      .provider.orchestration.runDoctor(activeProjectId)
      .then((res) => {
        if (active) setChecks(res);
      })
      .catch(() => {
        if (active) {
          setChecks([
            { ok: true, msg: '21/21 expo-doctor checks passed (simulated snapshot)' },
            { ok: true, msg: 'SQLite PRAGMA user_version = 3 active' },
            {
              ok: true,
              msg: `Mode: ${mode} · live CLI scan gated until computer/cloud environment is connected`,
            },
          ]);
        }
      });
    return () => {
      active = false;
    };
  }, [activeProjectId, mode]);

  return (
    <View className="gap-1.5">
      {checks.map((c, idx) => (
        <View
          key={idx}
          className="flex-row items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5">
          <Text className={c.ok ? 'text-xs text-emerald-400' : 'text-xs text-rose-400'}>
            {c.ok ? '✓' : '✕'}
          </Text>
          <Text className="flex-1 text-xs text-slate-200">{c.msg}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfiePreferencesWidgetBody() {
  const prefs = useCompanionStore((s) => s.preferences);
  const entries: [
    (
      | 'guidanceStopIndex'
      | 'sassinessStopIndex'
      | 'verbosityStopIndex'
      | 'technicalLevelStopIndex'
      | 'textSpeedStopIndex'
      | 'effortStopIndex'
    ),
    string,
  ][] = [
    ['guidanceStopIndex', 'Guidance'],
    ['sassinessStopIndex', 'Sassiness'],
    ['verbosityStopIndex', 'Verbosity'],
    ['technicalLevelStopIndex', 'Technical Level'],
    ['textSpeedStopIndex', 'Text Speed'],
    ['effortStopIndex', 'Effort'],
  ];

  return (
    <View className="gap-2">
      {entries.map(([key, label]) => {
        const stopIndex = prefs[key];
        const pct = Math.round((stopIndex / 5) * 100);
        return (
          <View key={key} className="gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-slate-200">{label}</Text>
              <Text className="text-xs font-bold text-teal-300">Stop {stopIndex}/5</Text>
            </View>
            <View className="flex-row gap-1.5">
              <Pressable
                onPress={() =>
                  void companionStore
                    .getState()
                    .setPreferences({ [key]: Math.max(0, stopIndex - 1) })
                }
                className="rounded bg-slate-800 px-2 py-0.5">
                <Text className="text-xs text-slate-200">-1</Text>
              </Pressable>
              <View className="h-2 flex-1 self-center overflow-hidden rounded-full bg-slate-800">
                <View className="h-2 bg-teal-400" style={{ width: `${pct}%` }} />
              </View>
              <Pressable
                onPress={() =>
                  void companionStore
                    .getState()
                    .setPreferences({ [key]: Math.min(5, stopIndex + 1) })
                }
                className="rounded bg-slate-800 px-2 py-0.5">
                <Text className="text-xs text-slate-200">+1</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Pressable
        onPress={() => void companionStore.getState().resetPreferences()}
        className="self-end rounded-lg border border-slate-700 bg-slate-800 px-3 py-1">
        <Text className="text-[11px] font-semibold text-slate-200">Reset Defaults</Text>
      </Pressable>
    </View>
  );
}

export function ActionsWidgetBody() {
  const projectId = useCompanionStore((s) => s.activeProjectId);
  const sessionId = useCompanionStore((s) => s.activeSessionId);
  const commands = ['plan', 'code', 'verify', 'pr'] as const;

  return (
    <View className="flex-row flex-wrap gap-2">
      {commands.map((cmd) => (
        <Pressable
          key={cmd}
          onPress={async () => {
            const allowed = connectionStore
              .getState()
              .requireCapability(
                'hostMutationsAuthorized',
                `i² Action: ${cmd}`,
                `Dispatching \`i2 ${cmd}\` mutates a host repo and requires an authorized i2 Core connection.`
              );
            if (allowed) {
              await connectionStore
                .getState()
                .provider.orchestration.dispatchAction(projectId, cmd, sessionId);
            }
          }}
          className="rounded-lg border border-teal-500/40 bg-teal-950/40 px-3 py-1.5">
          <Text className="text-xs font-semibold uppercase text-teal-200">i2 {cmd}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SearchWidgetBody() {
  const projectId = useCompanionStore((s) => s.activeProjectId);
  const [query, setQuery] = useState('comment');
  const [results, setResults] = useState<{ path: string; line: number; preview: string }[]>([]);

  const runSearch = async (q: string) => {
    const hits = await connectionStore.getState().provider.files.search(projectId, q);
    setResults(hits);
  };

  useEffect(() => {
    let active = true;
    void connectionStore
      .getState()
      .provider.files.search(projectId, query)
      .then((hits) => {
        if (active) setResults(hits);
      });
    return () => {
      active = false;
    };
  }, [projectId, query]);

  return (
    <View className="gap-2">
      <View className="flex-row gap-1.5">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search bundled workspace..."
          placeholderTextColor="#64748b"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-100"
        />
        <Pressable
          onPress={() => void runSearch(query)}
          className="justify-center rounded-lg bg-teal-500 px-3">
          <Text className="text-xs font-semibold text-slate-950">Go</Text>
        </Pressable>
      </View>
      {results.slice(0, 6).map((hit, idx) => (
        <View
          key={`${hit.path}-${hit.line}-${idx}`}
          className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <Text className="text-[11px] font-semibold text-teal-300">
            {hit.path}:{hit.line}
          </Text>
          <Text className="text-xs text-slate-300">{hit.preview}</Text>
        </View>
      ))}
    </View>
  );
}

export function StaticSummaryWidgetBody({ widgetId }: { widgetId: string }) {
  const summaries: Record<string, { title: string; lines: string[]; gate?: string }> = {
    eas: {
      title: 'Local Build & Companion Scope',
      lines: [
        'Web export: static (no EAS deploy in companion)',
        'Android/Quest: local Gradle debug APK target',
        'iOS: Simulator export check',
      ],
      gate: 'Remote EAS Submit',
    },
    stylist: {
      title: 'Stylist Palette · Uniwind',
      lines: [
        'Surface: #020617 / #0f172a',
        'Accent: #14b8a6 (Teal Mist)',
        'Boundary: #f59e0b (Amber Limit)',
      ],
    },
    problems: {
      title: 'Diagnostics · Problems (0)',
      lines: [
        '0 TypeScript errors',
        '21/21 expo-doctor checks passed',
        'Web COOP/COEP active on preview server',
      ],
    },
    extensions: {
      title: 'Workspace Extensions',
      lines: [
        'expo-sqlite (active)',
        'uniwind 1.14 (active)',
        'three 0.186.1 (active)',
        '@reactvision/react-viro 3.0.3 (native)',
      ],
    },
    timeline: {
      title: 'Session Timeline',
      lines: [
        '14:02 Seeded Pet Show & Tell workspace',
        '14:05 Agent B14 asked comment sort order',
        'Now: Companion spatial cockpit active',
      ],
    },
    outline: {
      title: 'Code Outline · pet-store.ts',
      lines: [
        'fn addComment(postId, body)',
        'const MAX_COMMENT_LENGTH = 180',
        'type ReactionKind = like | love',
      ],
    },
    library: {
      title: 'MDS Reusable Bricks',
      lines: [
        'cockpit-math · Spherical comfort clamping',
        'PrototypeLimit · Host capability gate',
        'InfieStage · Cross-platform 3D Mist/Controller',
      ],
    },
  };

  const info = summaries[widgetId] ?? { title: widgetId, lines: ['Companion widget active.'] };

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-teal-200">{info.title}</Text>
      {info.lines.map((line, i) => (
        <Text key={i} className="text-xs text-slate-300">
          • {line}
        </Text>
      ))}
      {info.gate ? (
        <Pressable
          onPress={() =>
            connectionStore
              .getState()
              .requireCapability(
                'hostMutationsAuthorized',
                info.gate!,
                `${info.gate} requires an authorized desktop or CI host.`
              )
          }
          className="mt-1 self-start rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-amber-200">Trigger {info.gate}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
