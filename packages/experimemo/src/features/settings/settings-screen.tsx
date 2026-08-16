import { Platform, StyleSheet, Text, View } from 'react-native';

import { KeyboardForm } from '../../components/swmansion/keyboard-form';
import { useAppTheme } from '../../theme/provider';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  const content = (
    <View style={styles.content}>
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay}>
        <View
          style={[
            styles.webModal,
            { backgroundColor: colors.background, borderColor: colors.primary },
          ]}>
          {content}
        </View>
      </View>
    );
  }

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  webOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'center',
    minHeight: '100%',
    padding: 20,
  },
  webModal: {
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: '0 18px 32px rgba(0, 0, 0, 0.22)',
    maxWidth: 460,
    padding: 20,
    width: '100%',
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
