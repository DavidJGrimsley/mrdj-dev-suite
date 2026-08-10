import { StyleSheet, Text, View } from 'react-native';

import { KeyboardForm } from '../../components/swmansion/keyboard-form';
import { useAppTheme } from '../../theme/provider';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontFamily,
              fontWeight:
                theme.typography.fontFamily === 'System' ||
                theme.typography.fontFamily === 'monospace'
                  ? '800'
                  : 'normal',
            },
          ]}>
          Settings
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>
          Keyboard Controller is ready for form-heavy screens.
        </Text>
      </View>
      <KeyboardForm />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
