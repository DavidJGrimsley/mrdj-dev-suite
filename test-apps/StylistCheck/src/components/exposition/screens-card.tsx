import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { enableScreens } from 'react-native-screens';

export function ScreensCard() {
  useEffect(() => {
    enableScreens(true);
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Native Screens</Text>
      <Text style={styles.body}>react-native-screens is enabled so navigation can use native screen primitives for better memory and lifecycle behavior.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: '#312e81',
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: '#4338ca',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
