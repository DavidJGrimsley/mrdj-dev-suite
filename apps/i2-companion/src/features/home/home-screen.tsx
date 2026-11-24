import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { appSnapshot } from '../../data/mock-app';
import { useAppTheme } from '../../theme/provider';

export default function HomeScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 16 }}>
      <View className="items-center gap-2">
        <Text className="text-3xl font-extrabold" style={{ color: colors.text }}>
          i2 Companion
        </Text>
        <Text className="text-sm text-center" style={{ color: colors.text }}>
          {appSnapshot.audience}
        </Text>
      </View>
      <View className="gap-3">
        <Link href="/vr" asChild>
          <Pressable className="rounded-xl p-4" style={{ backgroundColor: colors.primary }}>
            <Text className="text-base font-bold text-slate-950">VR Spatial Cockpit</Text>
            <Text className="text-sm text-slate-900">
              Launch i2 Companion VR cockpit ({Platform.OS}).
            </Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable
            className="rounded-xl border p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.primary }}>
            <Text className="text-base font-bold" style={{ color: colors.text }}>
              Settings
            </Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
