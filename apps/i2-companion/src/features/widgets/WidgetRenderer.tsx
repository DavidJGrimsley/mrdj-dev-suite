import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { WIDGET_CATALOG } from '../../data/widget-catalog';
import { layoutStore } from '../../stores/layout-store';
import type { CanonicalWidgetId, SpatialWidgetPlacement } from '../../types/widgets';
import {
  ChecklistWidgetBody,
  CurrentGoalWidgetBody,
  EmulatorDeviceWidgetBody,
  EmulatorWebWidgetBody,
  GlobalTodoWidgetBody,
  Infie3dWidgetBody,
  InfieChatWidgetBody,
  MusicWidgetBody,
  ProjectFolderWidgetBody,
  SessionsWidgetBody,
  WidgetsLauncherBody,
} from './CoreAndEmuWidgets';
import {
  ActionsWidgetBody,
  DoctorWidgetBody,
  ExplorerWidgetBody,
  GitWidgetBody,
  InfiePreferencesWidgetBody,
  SearchWidgetBody,
  StaticSummaryWidgetBody,
  TerminalWidgetBody,
} from './DevToolWidgets';
import { EnvironmentWidgetBody } from './EnvironmentWidget';

export interface WidgetRendererProps {
  placement: SpatialWidgetPlacement;
  compact?: boolean;
  onOpenGallery?: () => void;
}

export function renderWidgetContent(
  widgetId: CanonicalWidgetId,
  options?: { compact?: boolean; onOpenGallery?: () => void }
) {
  switch (widgetId) {
    case 'infie3d':
      return <Infie3dWidgetBody compact={options?.compact} />;
    case 'infieChat':
      return <InfieChatWidgetBody />;
    case 'workspaceEnv':
      return <EnvironmentWidgetBody />;
    case 'globalTodo':
      return <GlobalTodoWidgetBody />;
    case 'projectFolder':
      return <ProjectFolderWidgetBody />;
    case 'currentGoal':
      return <CurrentGoalWidgetBody />;
    case 'agentTasks':
      return <ChecklistWidgetBody kind="agent" />;
    case 'humanTesting':
      return <ChecklistWidgetBody kind="human" />;
    case 'sessions':
      return <SessionsWidgetBody />;
    case 'emuWeb':
      return <EmulatorWebWidgetBody />;
    case 'emuAndroid':
      return <EmulatorDeviceWidgetBody target="android" />;
    case 'emuIos':
      return <EmulatorDeviceWidgetBody target="ios" />;
    case 'music':
      return <MusicWidgetBody />;
    case 'widgets':
      return <WidgetsLauncherBody onOpenGallery={options?.onOpenGallery} />;
    case 'explorer':
      return <ExplorerWidgetBody />;
    case 'git':
      return <GitWidgetBody />;
    case 'terminal':
      return <TerminalWidgetBody />;
    case 'doctor':
      return <DoctorWidgetBody />;
    case 'infiePreferences':
      return <InfiePreferencesWidgetBody />;
    case 'actions':
      return <ActionsWidgetBody />;
    case 'search':
      return <SearchWidgetBody />;
    default:
      return <StaticSummaryWidgetBody widgetId={widgetId} />;
  }
}

export function WidgetCard({ placement, compact, onOpenGallery }: WidgetRendererProps) {
  const entry = WIDGET_CATALOG.find((w) => w.id === placement.widgetId);
  const label = entry?.label ?? placement.widgetId;

  return (
    <View className="gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/95 p-3">
      <View className="flex-row items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-teal-300">{label}</Text>
          {entry?.description && !compact ? (
            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
              {entry.description}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => layoutStore.getState().setFocusedWidget(placement.widgetId)}
            className="rounded-md bg-slate-800 px-2 py-1">
            <Text className="text-[10px] font-semibold text-slate-300">Focus</Text>
          </Pressable>
          <Pressable
            onPress={() => void layoutStore.getState().removeWidget(placement.widgetId)}
            className="rounded-md bg-slate-800 px-2 py-1">
            <Text className="text-[10px] font-semibold text-slate-400">Hide</Text>
          </Pressable>
        </View>
      </View>

      {renderWidgetContent(placement.widgetId, { compact, onOpenGallery })}
    </View>
  );
}
