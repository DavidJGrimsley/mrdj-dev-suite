import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { WIDGET_CATALOG } from '../../data/widget-catalog';
import { layoutStore, useLayoutStore } from '../../stores/layout-store';
import type { CanonicalWidgetId } from '../../types/widgets';

export interface WidgetsGalleryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WidgetsGalleryModal({ visible, onClose }: WidgetsGalleryModalProps) {
  const presets = useLayoutStore((s) => s.presets);
  const currentScope = useLayoutStore((s) => s.currentScope);
  const activePresetId = useLayoutStore(
    (s) => s.activePresetByScope[s.currentScope] ?? 'minimal-infie-emu'
  );
  const maxWindowLayers = useLayoutStore((s) => s.maxWindowLayers);
  const lastLayerLimitNotice = useLayoutStore((s) => s.lastLayerLimitNotice);
  const activePreset = presets.find((p) => p.presetId === activePresetId) ?? presets[0];

  const [newPresetName, setNewPresetName] = useState('');
  const [targetWindowId, setTargetWindowId] = useState<'new' | string>('new');
  const [filterCat, setFilterCat] = useState<
    'all' | 'core' | 'devTools' | 'diagnostics' | 'emulators'
  >('all');

  if (!visible) return null;

  const visibleWindows = activePreset.windows
    .filter((w) => w.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const activeWidgetIds = new Set<CanonicalWidgetId>();
  for (const w of visibleWindows) {
    for (const id of w.widgetIds) activeWidgetIds.add(id);
  }

  const effectiveTargetWindowId =
    targetWindowId !== 'new' && visibleWindows.some((w) => w.windowId === targetWindowId)
      ? targetWindowId
      : 'new';

  const handleCatalogAction = (id: CanonicalWidgetId) => {
    const st = layoutStore.getState();
    if (effectiveTargetWindowId === 'new') {
      if (activeWidgetIds.has(id)) {
        void st.removeWidget(id);
      } else {
        void st.addWindow([id]);
      }
      return;
    }

    const hostWin = visibleWindows.find((w) => w.windowId === effectiveTargetWindowId);
    if (hostWin?.widgetIds.includes(id)) {
      void st.removeWidget(id);
    } else {
      void st.groupWidgetIntoWindow(effectiveTargetWindowId, id);
    }
  };

  const filtered = WIDGET_CATALOG.filter(
    (entry) => filterCat === 'all' || entry.category === filterCat
  );

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/85 p-4">
        <View className="max-h-[92%] w-full max-w-4xl gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-slate-50">
                OpenXR Floating Windows, Groups &amp; Layouts
              </Text>
              <Text className="text-xs text-slate-400">
                Scope: {currentScope} · Preset: {activePreset.name} · {visibleWindows.length}/
                {maxWindowLayers} OpenXR window layers ({activeWidgetIds.size} widgets)
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-lg bg-slate-800 px-3 py-1.5">
              <Text className="text-xs font-semibold text-slate-200">Done</Text>
            </Pressable>
          </View>

          {lastLayerLimitNotice ? (
            <View className="flex-row items-center justify-between gap-2 rounded-xl border border-amber-500/50 bg-amber-950/40 px-3 py-2">
              <Text className="flex-1 text-xs font-semibold text-amber-200">
                {lastLayerLimitNotice}
              </Text>
              <Pressable
                onPress={() => layoutStore.getState().clearLayerLimitNotice()}
                className="rounded bg-amber-900 px-2 py-1">
                <Text className="text-[10px] font-bold text-amber-100">OK</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView className="gap-3">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-300">
              Saved Layouts
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {presets.map((preset) => {
                const selected = preset.presetId === activePreset.presetId;
                const winCount = preset.windows.filter((w) => w.visible).length;
                return (
                  <View
                    key={preset.presetId}
                    className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                      selected
                        ? 'border-teal-400 bg-teal-500/20'
                        : 'border-slate-700 bg-slate-800/80'
                    }`}>
                    <Pressable
                      onPress={() => void layoutStore.getState().switchPreset(preset.presetId)}>
                      <Text
                        className={`text-xs font-semibold ${
                          selected ? 'text-teal-200' : 'text-slate-200'
                        }`}>
                        {preset.name} ({winCount} win / {preset.widgets.length} widgets)
                      </Text>
                    </Pressable>
                    {!preset.isBuiltin ? (
                      <Pressable
                        onPress={() =>
                          void layoutStore.getState().deleteCustomPreset(preset.presetId)
                        }>
                        <Text className="text-xs font-bold text-rose-400">×</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View className="mb-3 flex-row flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <TextInput
                value={newPresetName}
                onChangeText={setNewPresetName}
                placeholder="Save current layout as..."
                placeholderTextColor="#64748b"
                className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
              />
              <Pressable
                onPress={() => {
                  const trimmed = newPresetName.trim();
                  if (!trimmed) return;
                  void layoutStore.getState().saveAsNewPreset(trimmed);
                  setNewPresetName('');
                }}
                className="rounded-lg bg-teal-500 px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-950">Save As</Text>
              </Pressable>
              {!activePreset.isBuiltin ? (
                <Pressable
                  onPress={() => {
                    const trimmed = newPresetName.trim();
                    if (trimmed) {
                      void layoutStore.getState().renamePreset(activePreset.presetId, trimmed);
                      setNewPresetName('');
                    } else {
                      void layoutStore.getState().overwriteCustomPreset(activePreset.presetId);
                    }
                  }}
                  className="rounded-lg border border-teal-500/40 bg-teal-950/40 px-2.5 py-1.5">
                  <Text className="text-xs font-semibold text-teal-200">
                    {newPresetName.trim() ? 'Rename' : 'Update Saved'}
                  </Text>
                </Pressable>
              ) : null}
              {activePreset.isBuiltin ? (
                <Pressable
                  onPress={() => void layoutStore.getState().resetActivePresetToDefault()}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5">
                  <Text className="text-xs text-slate-300">Reset Default</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[11px] font-semibold text-slate-400">VR Arrange:</Text>
                {(['free', 'arc'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => void layoutStore.getState().setArrangeMode(m)}
                    className={`rounded-md px-2 py-1 ${
                      activePreset.arrangeMode === m ? 'bg-teal-500' : 'bg-slate-800'
                    }`}>
                    <Text
                      className={`text-[11px] font-semibold uppercase ${
                        activePreset.arrangeMode === m ? 'text-slate-950' : 'text-slate-300'
                      }`}>
                      {m}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[11px] font-semibold text-slate-400">Posture:</Text>
                {(['standing', 'seated'] as const).map((pos) => (
                  <Pressable
                    key={pos}
                    onPress={() => void layoutStore.getState().setPosture(pos)}
                    className={`rounded-md px-2 py-1 ${
                      activePreset.posture === pos ? 'bg-teal-500' : 'bg-slate-800'
                    }`}>
                    <Text
                      className={`text-[11px] font-semibold uppercase ${
                        activePreset.posture === pos ? 'text-slate-950' : 'text-slate-300'
                      }`}>
                      {pos}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* OpenXR Windows & Grouped Widgets Manager */}
            <View className="mb-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-teal-300">
                Active OpenXR Windows ({visibleWindows.length}/{maxWindowLayers} max hardware
                layers)
              </Text>
              {visibleWindows.map((win) => (
                <View
                  key={win.windowId}
                  className="gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-2">
                  <View className="flex-row flex-wrap items-center justify-between gap-1.5">
                    <View className="min-w-[160px] flex-1">
                      <Text className="text-xs font-semibold text-slate-100">
                        {win.title} · [{win.layoutMode.toUpperCase()}]
                      </Text>
                      <Text className="text-[10px] text-slate-400">
                        yaw {Math.round(win.yawDeg)}° · pitch {Math.round(win.pitchDeg)}° ·{' '}
                        {win.radiusM.toFixed(2)}m · {win.widthM.toFixed(2)}×{win.heightM.toFixed(2)}
                        m
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-1">
                      <Pressable
                        onPress={() =>
                          void layoutStore
                            .getState()
                            .setWindowLayoutMode(
                              win.windowId,
                              win.layoutMode === 'tabs' ? 'stack' : 'tabs'
                            )
                        }
                        className="rounded bg-slate-800 px-1.5 py-0.5">
                        <Text className="text-[10px] text-teal-200">
                          {win.layoutMode === 'tabs' ? 'Stack' : 'Tabs'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          void layoutStore.getState().nudgeWindowPose(win.windowId, { yawDeg: -10 })
                        }
                        className="rounded bg-slate-800 px-1.5 py-0.5">
                        <Text className="text-[10px] text-slate-200">◀ Yaw</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          void layoutStore.getState().nudgeWindowPose(win.windowId, { yawDeg: 10 })
                        }
                        className="rounded bg-slate-800 px-1.5 py-0.5">
                        <Text className="text-[10px] text-slate-200">Yaw ▶</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          void layoutStore.getState().resizeWindowBy(win.windowId, 0.12, 0.08)
                        }
                        className="rounded bg-slate-800 px-1.5 py-0.5">
                        <Text className="text-[10px] text-teal-200">+Size</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          void layoutStore.getState().resizeWindowBy(win.windowId, -0.12, -0.08)
                        }
                        className="rounded bg-slate-800 px-1.5 py-0.5">
                        <Text className="text-[10px] text-slate-300">-Size</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void layoutStore.getState().closeWindow(win.windowId)}
                        className="rounded bg-rose-950/70 px-1.5 py-0.5">
                        <Text className="text-[10px] text-rose-200">Close</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5">
                    {win.widgetIds.map((wid, idx) => {
                      const label = WIDGET_CATALOG.find((c) => c.id === wid)?.label ?? wid;
                      return (
                        <View
                          key={wid}
                          className="flex-row items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5">
                          <Text className="text-[10px] text-slate-200">{label}</Text>
                          {win.widgetIds.length > 1 && idx > 0 ? (
                            <Pressable
                              onPress={() =>
                                void layoutStore
                                  .getState()
                                  .reorderWidgetInWindow(win.windowId, wid, 'up')
                              }>
                              <Text className="text-[10px] font-bold text-slate-400">↑</Text>
                            </Pressable>
                          ) : null}
                          {win.widgetIds.length > 1 ? (
                            <Pressable
                              onPress={() =>
                                void layoutStore
                                  .getState()
                                  .ungroupWidgetToNewWindow(win.windowId, wid)
                              }>
                              <Text className="text-[10px] font-bold text-teal-300">Pop</Text>
                            </Pressable>
                          ) : null}
                          <Pressable onPress={() => void layoutStore.getState().removeWidget(wid)}>
                            <Text className="text-[10px] font-bold text-rose-400">×</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {/* Target Destination Picker when adding widgets from Catalog */}
            <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
              <Text className="text-[11px] font-semibold text-slate-400">Add target:</Text>
              <Pressable
                onPress={() => setTargetWindowId('new')}
                className={`rounded-md px-2 py-1 ${
                  effectiveTargetWindowId === 'new' ? 'bg-teal-500' : 'bg-slate-800'
                }`}>
                <Text
                  className={`text-[11px] font-semibold ${
                    effectiveTargetWindowId === 'new' ? 'text-slate-950' : 'text-slate-200'
                  }`}>
                  + New OpenXR Window
                </Text>
              </Pressable>
              {visibleWindows.map((win) => (
                <Pressable
                  key={win.windowId}
                  onPress={() => setTargetWindowId(win.windowId)}
                  className={`rounded-md px-2 py-1 ${
                    effectiveTargetWindowId === win.windowId ? 'bg-teal-500' : 'bg-slate-800'
                  }`}>
                  <Text
                    className={`text-[11px] font-semibold ${
                      effectiveTargetWindowId === win.windowId ? 'text-slate-950' : 'text-slate-200'
                    }`}>
                    Group: {win.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mb-2 flex-row flex-wrap gap-1.5">
              {(['all', 'core', 'devTools', 'diagnostics', 'emulators'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCat(cat)}
                  className={`rounded-full px-2.5 py-1 ${
                    filterCat === cat ? 'bg-teal-500' : 'bg-slate-800'
                  }`}>
                  <Text
                    className={`text-[11px] font-semibold ${
                      filterCat === cat ? 'text-slate-950' : 'text-slate-300'
                    }`}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              {filtered.map((entry) => {
                const enabled = activeWidgetIds.has(entry.id);
                const hostWin =
                  effectiveTargetWindowId !== 'new'
                    ? visibleWindows.find((w) => w.windowId === effectiveTargetWindowId)
                    : null;
                const inHost = hostWin?.widgetIds.includes(entry.id) ?? false;
                const ctaLabel =
                  effectiveTargetWindowId === 'new'
                    ? enabled
                      ? 'ACTIVE (Tap Remove)'
                      : '+ NEW WINDOW'
                    : inHost
                      ? 'IN GROUP (Remove)'
                      : '+ GROUP HERE';
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => handleCatalogAction(entry.id)}
                    className={`w-full rounded-xl border p-3 sm:w-[48%] ${
                      enabled
                        ? 'border-teal-500/60 bg-teal-950/40'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-semibold text-slate-100">{entry.label}</Text>
                      <Text
                        className={`text-[11px] font-bold ${
                          enabled ? 'text-teal-300' : 'text-slate-500'
                        }`}>
                        {ctaLabel}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-slate-400">{entry.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
