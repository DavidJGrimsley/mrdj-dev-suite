import React from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { WIDGET_CATALOG } from '../../data/widget-catalog';
import { layoutStore, useLayoutStore } from '../../stores/layout-store';
import type { CanonicalWidgetId, SpatialWindow } from '../../types/widgets';
import { WidgetCard } from './WidgetRenderer';

export interface WidgetDockProps {
  onOpenGallery: () => void;
}

function WindowGroupPanel({
  win,
  placementByWidgetId,
  compact = false,
  onOpenGallery,
}: {
  win: SpatialWindow;
  placementByWidgetId: Map<
    CanonicalWidgetId,
    ReturnType<typeof layoutStore.getState>['presets'][number]['widgets'][number]
  >;
  compact?: boolean;
  onOpenGallery: () => void;
}) {
  const widgetIds = win.widgetIds.filter(
    (id): id is Exclude<CanonicalWidgetId, 'infie3d'> => id !== 'infie3d'
  );
  if (widgetIds.length === 0) return null;

  if (widgetIds.length === 1) {
    const p = placementByWidgetId.get(widgetIds[0]);
    if (!p) return null;
    return <WidgetCard placement={p} compact={compact} onOpenGallery={onOpenGallery} />;
  }

  const activeWidget =
    win.activeWidgetId && win.activeWidgetId !== 'infie3d' && widgetIds.includes(win.activeWidgetId)
      ? win.activeWidgetId
      : widgetIds[0];
  const shownIds = win.layoutMode === 'tabs' ? [activeWidget] : widgetIds;

  return (
    <View className="gap-2 rounded-2xl border border-teal-500/35 bg-slate-900/60 p-2.5">
      <View className="flex-row flex-wrap items-center justify-between gap-2 px-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-teal-300">{win.title}</Text>
          <Text className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
            {widgetIds.length} grouped · {win.layoutMode.toUpperCase()}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() =>
              void layoutStore
                .getState()
                .setWindowLayoutMode(win.windowId, win.layoutMode === 'tabs' ? 'stack' : 'tabs')
            }
            className="rounded-md bg-slate-800 px-2 py-1">
            <Text className="text-[10px] font-semibold text-slate-200">
              {win.layoutMode === 'tabs' ? 'Stack All' : 'Tab View'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void layoutStore.getState().closeWindow(win.windowId)}
            className="rounded-md bg-rose-950/70 px-2 py-1">
            <Text className="text-[10px] font-semibold text-rose-200">Close Win</Text>
          </Pressable>
        </View>
      </View>

      {win.layoutMode === 'tabs' ? (
        <View className="flex-row flex-wrap gap-1 px-1">
          {widgetIds.map((wid) => {
            const selected = wid === activeWidget;
            const label = WIDGET_CATALOG.find((c) => c.id === wid)?.label ?? wid;
            return (
              <Pressable
                key={wid}
                onPress={() => void layoutStore.getState().setWindowActiveWidget(win.windowId, wid)}
                className={`rounded-lg px-2.5 py-1 ${
                  selected ? 'bg-teal-500' : 'border border-slate-700 bg-slate-900'
                }`}>
                <Text
                  className={`text-[11px] font-semibold ${
                    selected ? 'text-slate-950' : 'text-slate-200'
                  }`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="gap-2">
        {shownIds.map((wid) => {
          const p = placementByWidgetId.get(wid);
          if (!p) return null;
          return (
            <WidgetCard
              key={p.instanceId}
              placement={p}
              compact={compact}
              onOpenGallery={onOpenGallery}
            />
          );
        })}
      </View>
    </View>
  );
}

export function WidgetDock({ onOpenGallery }: WidgetDockProps) {
  const { width } = useWindowDimensions();
  const presets = useLayoutStore((s) => s.presets);
  const activePresetId = useLayoutStore(
    (s) => s.activePresetByScope[s.currentScope] ?? 'minimal-infie-emu'
  );
  const activePreset = presets.find((p) => p.presetId === activePresetId) ?? presets[0];

  const visibleWindows = activePreset.windows
    .filter((w) => w.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const placementByWidgetId = new Map(
    activePreset.widgets.filter((w) => w.visible).map((w) => [w.widgetId, w])
  );
  const infiePlacement = placementByWidgetId.get('infie3d') ?? null;

  const isWideDesktop = width >= 980;

  if (!isWideDesktop) {
    return (
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
        {infiePlacement ? (
          <WidgetCard placement={infiePlacement} onOpenGallery={onOpenGallery} />
        ) : null}
        {visibleWindows.map((win) => (
          <WindowGroupPanel
            key={win.windowId}
            win={win}
            placementByWidgetId={placementByWidgetId}
            onOpenGallery={onOpenGallery}
          />
        ))}
      </ScrollView>
    );
  }

  const left = visibleWindows.filter((w) => w.dockZone === 'left');
  const center = visibleWindows.filter((w) => w.dockZone === 'center');
  const right = visibleWindows.filter((w) => w.dockZone === 'right');
  const bottom = visibleWindows.filter((w) => w.dockZone === 'bottom');

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 36 }}>
      <View className="flex-row items-start gap-3">
        {left.length > 0 ? (
          <View className="w-[30%] min-w-[260px] gap-3">
            {left.map((win) => (
              <WindowGroupPanel
                key={win.windowId}
                win={win}
                placementByWidgetId={placementByWidgetId}
                onOpenGallery={onOpenGallery}
              />
            ))}
          </View>
        ) : null}

        <View className="min-w-[320px] flex-1 gap-3">
          {infiePlacement ? (
            <WidgetCard placement={infiePlacement} onOpenGallery={onOpenGallery} />
          ) : null}
          {center.map((win) => (
            <WindowGroupPanel
              key={win.windowId}
              win={win}
              placementByWidgetId={placementByWidgetId}
              onOpenGallery={onOpenGallery}
            />
          ))}
        </View>

        {right.length > 0 ? (
          <View className="w-[30%] min-w-[260px] gap-3">
            {right.map((win) => (
              <WindowGroupPanel
                key={win.windowId}
                win={win}
                placementByWidgetId={placementByWidgetId}
                onOpenGallery={onOpenGallery}
              />
            ))}
          </View>
        ) : null}
      </View>

      {bottom.length > 0 ? (
        <View className="flex-row flex-wrap gap-3">
          {bottom.map((win) => (
            <View key={win.windowId} className="min-w-[280px] flex-1">
              <WindowGroupPanel
                win={win}
                placementByWidgetId={placementByWidgetId}
                compact
                onOpenGallery={onOpenGallery}
              />
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
