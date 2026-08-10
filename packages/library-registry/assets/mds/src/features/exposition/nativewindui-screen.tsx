import { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/nativewindui/ActivityIndicator';
import { Avatar, AvatarFallback } from '../../components/nativewindui/Avatar';
import { Button } from '../../components/nativewindui/Button';
import { DatePicker } from '../../components/nativewindui/DatePicker';
import { Picker, PickerItem } from '../../components/nativewindui/Picker';
import { ProgressIndicator } from '../../components/nativewindui/ProgressIndicator';
import { Slider } from '../../components/nativewindui/Slider';
import { Text } from '../../components/nativewindui/Text';
import { ThemeToggle } from '../../components/nativewindui/ThemeToggle';
import { Toggle } from '../../components/nativewindui/Toggle';
import { ExpositionNotice } from '../../components/exposition';
import { useAppTheme } from '../../theme/provider';

export default function NativeWindUiScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const [enabled, setEnabled] = useState(true);
  const [intensity, setIntensity] = useState(0.64);
  const [density, setDensity] = useState('balanced');
  const [appointmentDate, setAppointmentDate] = useState<Date>(new Date());
  const progress = useMemo(() => Math.round(intensity * 100), [intensity]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="largeTitle" className="font-black text-slate-950 dark:text-white">NativeWindUI Exposition</Text>
        <Text variant="body" color="secondary">Generated when NativeWindUI is selected; this page exercises the local NativeWindUI primitives that create-expo-stack installs.</Text>
      </View>
      <ExpositionNotice />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>
        <Text variant="heading">Interactive primitives</Text>
        <View style={styles.feedbackRow}>
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              <Text variant="caption2">NW</Text>
            </AvatarFallback>
          </Avatar>
          <View style={styles.feedbackBody}>
            <Text variant="subhead">Theme preview controls</Text>
            <Text variant="footnote" color="secondary">Avatar and ThemeToggle are local NativeWindUI primitives.</Text>
          </View>
          <ThemeToggle />
        </View>
        <View style={styles.row}>
          <Button onPress={() => Linking.openURL('https://nativewindui.com')} variant="primary">
            <Text>Open NativeWindUI docs</Text>
          </Button>
          <Button variant="tonal">
            <Text>{density}</Text>
          </Button>
        </View>
        <View style={styles.controlRow}>
          <Text variant="callout">Enable generated theme bridge</Text>
          <Toggle value={enabled} onValueChange={setEnabled} />
        </View>
        <Slider value={intensity} onValueChange={setIntensity} />
        <ProgressIndicator value={progress} />
        <Text variant="footnote" color="secondary">Progress {progress}% - Toggle {enabled ? 'on' : 'off'}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>
        <Text variant="heading">Picker, DatePicker, and feedback</Text>
        <Picker selectedValue={density} onValueChange={(value) => setDensity(String(value))}>
          <PickerItem label="Compact density" value="compact" />
          <PickerItem label="Balanced density" value="balanced" />
          <PickerItem label="Spacious density" value="spacious" />
        </Picker>
        {Platform.OS !== "web" ? (
          <DatePicker mode="date" value={appointmentDate} onChange={(_event, selected) => selected && setAppointmentDate(selected)} />
        ) : (
          <Text variant="footnote" color="secondary">DatePicker preview appears on native targets.</Text>
        )}
        <View style={styles.feedbackRow}>
          <ActivityIndicator />
          <View style={styles.feedbackBody}>
            <Text variant="subhead" color="secondary">NativeWind class tokens, generated theme colors, and Expo web are rendering together.</Text>
            <Text variant="footnote" color="secondary">Date: {appointmentDate.toDateString()}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 84,
  },
  header: {
    gap: 8,
  },
  card: {
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  feedbackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  feedbackBody: {
    flex: 1,
    gap: 4,
  },
});
