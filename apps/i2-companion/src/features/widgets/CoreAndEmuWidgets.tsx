import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  B14_AGENT_QUESTION,
  LEEK_BEATS_TRACKS,
  SEEDED_FILES,
  capabilityLimitFor,
  importedProjectLimit,
  notHotdogLimit,
} from '../../data/seeded-workspace';
import { companionStore, useCompanionStore } from '../../stores/companion-store';
import { connectionStore, useConnectionStore } from '../../stores/connection-store';
import { useLayoutStore } from '../../stores/layout-store';
import { InfieControlsBar } from '../infie/InfieControlsBar';
import { InfieStage } from '../infie/InfieStage';

export function Infie3dWidgetBody({ compact }: { compact?: boolean }) {
  return (
    <View className="gap-2">
      <InfieStage height={compact ? 190 : 250} compact={compact} />
      <InfieControlsBar />
    </View>
  );
}

export function InfieChatWidgetBody() {
  const route = useCompanionStore((s) => s.route);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const activeSessionId = useCompanionStore((s) => s.activeSessionId);
  const messagesByScope = useCompanionStore((s) => s.messagesByScope);
  const projects = useCompanionStore((s) => s.projects);
  const sessions = useCompanionStore((s) => s.sessions);
  const whatsNextLines = useCompanionStore((s) => s.whatsNextLines);
  const b14Answer = useCompanionStore((s) => s.b14Answer);

  const scopeKey = route === 'session' ? `session:${activeSessionId}` : 'home';
  const messages = messagesByScope[scopeKey] ?? messagesByScope.home ?? [];
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const session = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const [draft, setDraft] = useState('');

  const sendReply = async (textToSend?: string) => {
    const clean = (textToSend ?? draft).trim();
    if (!clean) return;
    setDraft('');
    await companionStore.getState().sendChatMessage(scopeKey, clean, 'companion-2d', 'You');
  };

  return (
    <View className="gap-2">
      <View className="rounded-xl border border-teal-500/30 bg-teal-950/30 p-2.5">
        <Text className="text-xs font-semibold text-teal-200">
          {project.name} · {session.name} ({session.status})
        </Text>
        <Text className="mt-0.5 text-[11px] text-slate-300">{session.goal}</Text>
      </View>

      {project.id === 'pet' ? (
        <View className="gap-1.5 rounded-xl border border-amber-500/35 bg-amber-950/25 p-2.5">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Agent Question (B14) · Current:{' '}
            {b14Answer === 'oldest' ? 'Oldest first' : 'Newest first'}
          </Text>
          <Text className="text-xs text-slate-200">{B14_AGENT_QUESTION}</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .answerB14Question(session.id, 'newest', 'companion-2d')
              }
              className={`rounded-lg px-2.5 py-1 ${
                b14Answer !== 'oldest' ? 'bg-amber-400' : 'border border-slate-700 bg-slate-800'
              }`}>
              <Text
                className={`text-[11px] font-semibold ${
                  b14Answer !== 'oldest' ? 'text-slate-950' : 'text-slate-200'
                }`}>
                Newest first
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .answerB14Question(session.id, 'oldest', 'companion-2d')
              }
              className={`rounded-lg px-2.5 py-1 ${
                b14Answer === 'oldest' ? 'bg-amber-400' : 'border border-slate-700 bg-slate-800'
              }`}>
              <Text
                className={`text-[11px] font-semibold ${
                  b14Answer === 'oldest' ? 'text-slate-950' : 'text-slate-200'
                }`}>
                Oldest first
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ScrollView className="max-h-48 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 p-2">
        {messages.map((m) => (
          <View
            key={m.id}
            className={`mb-1.5 rounded-lg p-2 ${
              m.role === 'user' ? 'bg-teal-900/40' : 'bg-slate-900/90'
            }`}>
            <Text className="text-[10px] font-bold uppercase text-teal-300">
              {m.senderLabel ?? m.role}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-200">{m.content}</Text>
          </View>
        ))}
        {whatsNextLines.length > 0 ? (
          <View className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
            <Text className="text-[10px] font-bold uppercase text-teal-300">
              What&apos;s Next Scan
            </Text>
            {whatsNextLines.map((line, i) => (
              <Text key={i} className="mt-0.5 text-xs text-slate-300">
                • {line}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-1.5">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message Infie..."
          placeholderTextColor="#64748b"
          onSubmitEditing={() => void sendReply()}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
        />
        <Pressable
          onPress={() => void sendReply()}
          className="justify-center rounded-xl bg-teal-500 px-3">
          <Text className="text-xs font-semibold text-slate-950">Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function GlobalTodoWidgetBody() {
  const todos = useCompanionStore((s) => s.globalTodos);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const [text, setText] = useState('');

  return (
    <View className="gap-2">
      <View className="flex-row gap-1.5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add reminder or follow-up..."
          placeholderTextColor="#64748b"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
        />
        <Pressable
          onPress={() => {
            if (!text.trim()) return;
            void companionStore.getState().addGlobalTodo(text, activeProjectId, 'companion-2d');
            setText('');
          }}
          className="justify-center rounded-lg bg-teal-500 px-3">
          <Text className="text-xs font-semibold text-slate-950">Add</Text>
        </Pressable>
      </View>
      <View className="gap-1.5">
        {todos.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <Pressable
              onPress={() =>
                void companionStore.getState().toggleGlobalTodo(item.id, 'companion-2d')
              }
              className="flex-1 flex-row items-center gap-2">
              <Text className="text-xs text-teal-300">{item.done ? '☑' : '☐'}</Text>
              <Text
                className={`flex-1 text-xs ${
                  item.done ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}>
                {item.text}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void companionStore.getState().deleteGlobalTodo(item.id, 'companion-2d')
              }>
              <Text className="text-xs text-slate-500">✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProjectFolderWidgetBody() {
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const project = useCompanionStore((s) => s.projects.find((p) => p.id === activeProjectId));
  const [selectedFile, setSelectedFile] = useState<'info' | 'todo' | 'style' | 'guidelines'>(
    'info'
  );

  if (project && !project.wired) {
    return (
      <Pressable
        onPress={() =>
          companionStore
            .getState()
            .showPrototypeLimit(
              project.isPlaceholder
                ? notHotdogLimit(`Open ${project.name} project folder`)
                : importedProjectLimit(project.name, `Open ${project.name} project folder`)
            )
        }
        className="rounded-xl border border-amber-500/30 bg-slate-950/60 p-3">
        <Text className="text-xs font-semibold text-amber-200">
          {project.name} sources are a Prototype Limit placeholder. Tap for details.
        </Text>
      </Pressable>
    );
  }

  const projectFiles = SEEDED_FILES[activeProjectId] ?? SEEDED_FILES.pet;
  const contents: Record<typeof selectedFile, string> = {
    info: projectFiles['project/info.md'] ?? '# Project Info',
    todo: projectFiles['project/todo.md'] ?? '# Project Todo',
    style: projectFiles['project/style.md'] ?? '# Project Style',
    guidelines: projectFiles['project/guidelines.md'] ?? '# Project Guidelines',
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-1">
        {(['info', 'todo', 'style', 'guidelines'] as const).map((doc) => (
          <Pressable
            key={doc}
            onPress={() => setSelectedFile(doc)}
            className={`rounded-md px-2 py-1 ${
              selectedFile === doc ? 'bg-teal-500' : 'bg-slate-800'
            }`}>
            <Text
              className={`text-[11px] font-semibold ${
                selectedFile === doc ? 'text-slate-950' : 'text-slate-300'
              }`}>
              {doc}.md
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-300">
        {contents[selectedFile]}
      </Text>
    </View>
  );
}

export function CurrentGoalWidgetBody() {
  const sessionId = useCompanionStore((s) => s.activeSessionId);
  const session = useCompanionStore(
    (s) => s.sessions.find((x) => x.id === sessionId) ?? s.sessions[0]
  );
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs font-semibold text-teal-200">{session.goal}</Text>
        <Text className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-200">
          {session.status}
        </Text>
      </View>
      <Text className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-300">
        {session.planMarkdown}
      </Text>
    </View>
  );
}

export function ChecklistWidgetBody({ kind }: { kind: 'agent' | 'human' }) {
  const sessionId = useCompanionStore((s) => s.activeSessionId);
  const session = useCompanionStore(
    (s) => s.sessions.find((x) => x.id === sessionId) ?? s.sessions[0]
  );
  const items = kind === 'agent' ? session.agentTasks : session.humanTests;
  const allHumanDone = session.humanTests.length > 0 && session.humanTests.every((t) => t.done);

  return (
    <View className="gap-1.5">
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() =>
            kind === 'agent'
              ? void companionStore.getState().toggleAgentTask(session.id, item.id, 'companion-2d')
              : void companionStore.getState().toggleHumanTest(session.id, item.id, 'companion-2d')
          }
          className="flex-row items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-xs text-teal-300">{item.done ? '☑' : '☐'}</Text>
            <Text
              className={`flex-1 text-xs ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {item.text}
            </Text>
          </View>
          {item.provider ? (
            <Text className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-teal-200">
              {item.provider}
            </Text>
          ) : null}
        </Pressable>
      ))}
      {kind === 'human' && allHumanDone && session.status === 'VERIFIED' ? (
        <Pressable
          onPress={() =>
            void companionStore
              .getState()
              .advanceSessionStage(session.id, 'open-pr', 'companion-2d')
          }
          className="mt-1 items-center rounded-lg bg-teal-500 px-3 py-1.5">
          <Text className="text-xs font-bold text-slate-950">Open Simulated PR</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SessionsWidgetBody() {
  const projects = useCompanionStore((s) => s.projects);
  const sessions = useCompanionStore((s) => s.sessions);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const activeSessionId = useCompanionStore((s) => s.activeSessionId);

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-1.5">
        {projects.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => companionStore.getState().selectProject(p.id, 'companion-2d')}
            className={`rounded-lg px-2.5 py-1 ${
              p.id === activeProjectId ? 'bg-teal-500' : 'border border-slate-700 bg-slate-800'
            }`}>
            <Text
              className={`text-[11px] font-semibold ${p.id === activeProjectId ? 'text-slate-950' : 'text-slate-200'}`}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-1.5">
        {sessions
          .filter((s) => s.projectId === activeProjectId)
          .map((s) => (
            <Pressable
              key={s.id}
              onPress={() => companionStore.getState().selectSession(s.id, 'companion-2d')}
              className={`rounded-lg border p-2 ${
                s.id === activeSessionId
                  ? 'border-teal-400 bg-teal-950/40'
                  : 'border-slate-800 bg-slate-950/60'
              }`}>
              <Text className="text-xs font-semibold text-slate-100">{s.name}</Text>
              <Text className="text-[11px] text-teal-300">
                {s.status} · {s.branch} · {s.agents} agents
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}

export function EmulatorWebWidgetBody() {
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const appPreview = useCompanionStore((s) => s.appPreview);
  const [newComment, setNewComment] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isExperimemo = activeProjectId === 'experimemo';

  const handlePost = async () => {
    const res = await companionStore
      .getState()
      .postPreviewComment(newComment, 'companion-2d', 'Dev');
    if (!res.ok) {
      setValidationError(res.error ?? 'Invalid comment.');
      return;
    }
    setValidationError(null);
    setNewComment('');
  };

  return (
    <View className="gap-2 rounded-xl border border-emerald-700/40 bg-[#f7f5ef] p-3">
      <View className="flex-row flex-wrap items-center justify-between gap-1.5">
        <Text className="text-xs font-bold text-[#234e38]">
          {isExperimemo ? 'Experimemo · Web Preview' : 'Pet Show & Tell · Web Preview'}
        </Text>
        <Text className="rounded-full bg-[#234e38] px-2 py-0.5 text-[10px] font-semibold text-white">
          Simulated {appPreview.buildVersion} · {appPreview.targetBranch}
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-1.5">
        <Text className="text-[11px] text-slate-700">
          {isExperimemo
            ? 'Experiment logger offline web shell · aspect ratio 16:9 locked.'
            : `Comments ordered ${appPreview.sortOrder}-first (shared across previews).`}
        </Text>
        <View className="flex-row gap-1">
          {(['main', 'test', 'session'] as const).map((branch) => (
            <Pressable
              key={branch}
              onPress={() =>
                void companionStore.getState().setPreviewTarget(branch, 'companion-2d')
              }
              className={`rounded px-1.5 py-0.5 ${
                appPreview.targetBranch === branch ? 'bg-[#234e38]' : 'bg-slate-200'
              }`}>
              <Text
                className={`text-[10px] font-semibold ${
                  appPreview.targetBranch === branch ? 'text-white' : 'text-slate-700'
                }`}>
                {branch}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isExperimemo ? (
        <View className="rounded-lg border border-slate-200 bg-white p-2.5">
          <Text className="text-xs font-bold text-[#234e38]">Camera Aspect Calibration</Text>
          <Text className="mt-0.5 text-[11px] text-slate-700">
            16:9 preview container verified · local SQLite log active.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row gap-1.5">
            <TextInput
              value={newComment}
              onChangeText={(t) => {
                setNewComment(t);
                if (validationError) setValidationError(null);
              }}
              placeholder="Write comment (1..180 chars)..."
              placeholderTextColor="#64748b"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
            />
            <Pressable
              onPress={() => void handlePost()}
              className="justify-center rounded-lg bg-[#234e38] px-2.5">
              <Text className="text-xs font-semibold text-white">Post</Text>
            </Pressable>
          </View>
          {validationError ? (
            <Text className="text-[11px] font-semibold text-rose-700">{validationError}</Text>
          ) : null}
          {appPreview.comments.slice(0, 4).map((c) => (
            <View key={c.id} className="rounded-lg border border-slate-200 bg-white p-2">
              <Text className="text-[11px] font-bold text-[#234e38]">{c.author}</Text>
              <Text className="text-xs text-slate-800">{c.text}</Text>
              <View className="mt-1 flex-row gap-2">
                <Pressable
                  onPress={() =>
                    void companionStore
                      .getState()
                      .togglePreviewReaction(c.id, 'like', 'companion-2d')
                  }
                  className={`rounded px-2 py-0.5 ${
                    c.userReaction === 'like' ? 'bg-teal-600' : 'bg-slate-100'
                  }`}>
                  <Text
                    className={`text-[10px] font-semibold ${
                      c.userReaction === 'like' ? 'text-white' : 'text-slate-700'
                    }`}>
                    👍 Like {c.likes}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    void companionStore
                      .getState()
                      .togglePreviewReaction(c.id, 'love', 'companion-2d')
                  }
                  className={`rounded px-2 py-0.5 ${
                    c.userReaction === 'love' ? 'bg-rose-600' : 'bg-rose-50'
                  }`}>
                  <Text
                    className={`text-[10px] font-semibold ${
                      c.userReaction === 'love' ? 'text-white' : 'text-rose-700'
                    }`}>
                    ❤ Love {c.loves}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function EmulatorDeviceWidgetBody({ target }: { target: 'android' | 'ios' }) {
  const cap = useConnectionStore((s) => s.status.capabilities.emulatorsNative);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const appPreview = useCompanionStore((s) => s.appPreview);

  const label =
    target === 'android'
      ? 'Android App Preview · Pixel 9 Pro (Simulated)'
      : 'iOS App Preview · iPhone 16 Pro (Simulated)';
  const isExperimemo = activeProjectId === 'experimemo';
  const leadComment = appPreview.comments[0];

  return (
    <View className="gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs font-bold text-slate-100">{label}</Text>
        <Text className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200">
          Simulated Preview
        </Text>
      </View>

      <View className="gap-1.5 rounded-xl border border-emerald-700/30 bg-[#f7f5ef] p-2.5">
        <Text className="text-[11px] font-bold text-[#234e38]">
          {isExperimemo
            ? 'Experimemo · Lab Logger'
            : `Pet Show & Tell · ${appPreview.buildVersion} (${appPreview.sortOrder}-first)`}
        </Text>
        <Text className="text-[11px] text-slate-700">
          {isExperimemo
            ? 'Camera preview aspect ratio locked 16:9 · SQLite offline store ready'
            : leadComment
              ? `${leadComment.author}: "${leadComment.text}"`
              : 'No comments yet.'}
        </Text>
        {!isExperimemo && leadComment ? (
          <View className="mt-1 flex-row flex-wrap gap-1.5">
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .togglePreviewReaction(leadComment.id, 'like', 'companion-2d')
              }
              className={`rounded px-2 py-0.5 ${
                leadComment.userReaction === 'like' ? 'bg-teal-600' : 'bg-white'
              }`}>
              <Text
                className={`text-[10px] font-semibold ${
                  leadComment.userReaction === 'like' ? 'text-white' : 'text-slate-800'
                }`}>
                Like {leadComment.likes}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .togglePreviewReaction(leadComment.id, 'love', 'companion-2d')
              }
              className={`rounded px-2 py-0.5 ${
                leadComment.userReaction === 'love' ? 'bg-rose-600' : 'bg-rose-50'
              }`}>
              <Text
                className={`text-[10px] font-semibold ${
                  leadComment.userReaction === 'love' ? 'text-white' : 'text-rose-700'
                }`}>
                Love {leadComment.loves}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void companionStore
                  .getState()
                  .postPreviewComment(
                    `Checked on ${target === 'android' ? 'Android' : 'iOS'} preview!`,
                    'companion-2d',
                    target === 'android' ? 'Pixel Tester' : 'iOS Tester'
                  )
              }
              className="rounded bg-[#234e38] px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-white">Post Sample</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[10px] text-slate-400">
          Mode: {cap === 'simulated-app-preview' ? 'Simulated App Preview' : 'Live Preview'} (shared
          in-app state)
        </Text>
        <Pressable
          onPress={() =>
            connectionStore
              .getState()
              .requireCapability(
                'emulatorsNative',
                `${label} (Connected Build)`,
                `Running live ${target === 'android' ? 'Android' : 'iOS'} preview builds requires a future connected local computer or cloud environment.`
              )
          }
          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
          <Text className="text-[10px] font-semibold text-amber-200">Provider Info</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MusicWidgetBody() {
  const playing = useCompanionStore((s) => s.musicPlaying);
  const trackIndex = useCompanionStore((s) => s.musicTrackIndex);
  const track = LEEK_BEATS_TRACKS[trackIndex] ?? LEEK_BEATS_TRACKS[0];

  return (
    <View className="gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
      <Text className="text-xs font-bold text-teal-200">{track.title}</Text>
      <Text className="text-[11px] text-slate-400">
        {track.artist} · {playing ? 'Playing (Local Ambient)' : 'Paused'}
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => companionStore.getState().toggleMusic()}
          className="rounded-lg bg-teal-500 px-3 py-1">
          <Text className="text-xs font-semibold text-slate-950">{playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable
          onPress={() => companionStore.getState().nextTrack()}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1">
          <Text className="text-xs font-semibold text-slate-200">Next</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            companionStore
              .getState()
              .showPrototypeLimit(
                capabilityLimitFor(
                  'External Music Providers',
                  'Spotify / Apple Music Link',
                  'Connecting external streaming accounts stays behind Prototype Limit in the companion demo.'
                )
              )
          }
          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1">
          <Text className="text-[11px] text-slate-400">Providers</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WidgetsLauncherBody({ onOpenGallery }: { onOpenGallery?: () => void }) {
  const presets = useLayoutStore((s) => s.presets);
  return (
    <View className="gap-2">
      <Text className="text-xs text-slate-300">
        Add, remove, resize, and save multi-widget cockpit layouts ({presets.length} presets
        available).
      </Text>
      <Pressable onPress={onOpenGallery} className="items-center rounded-xl bg-teal-500 px-3 py-2">
        <Text className="text-xs font-semibold text-slate-950">
          Open Widgets &amp; Layout Gallery
        </Text>
      </Pressable>
    </View>
  );
}
