import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function QuestCompanionScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-slate-950 p-6">
      <Text className="text-xl font-bold text-indigo-300">Quest VR Spatial Cockpit</Text>
      <Text className="max-w-md text-center text-sm text-slate-300">
        The native OpenXR Viro spatial cockpit runs inside Meta Quest 3 / 3S builds
        (`QUEST_BUILD=1`). On Web, customize your spatial layouts in the dock directly.
      </Text>
      <Pressable onPress={() => router.replace('/')} className="rounded-xl bg-teal-500 px-4 py-2.5">
        <Text className="text-xs font-bold text-slate-950">Return to Workspace</Text>
      </Pressable>
    </View>
  );
}
