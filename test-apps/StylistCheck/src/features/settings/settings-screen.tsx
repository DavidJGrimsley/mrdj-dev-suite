import { StyleSheet, Text, View } from 'react-native';

import { KeyboardForm } from '../../components/exposition';

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.body}>Keyboard Controller is ready for form-heavy screens.</Text>
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
    fontWeight: "800",
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
