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
      <Text style={styles.body}>
        Expo Router in this create-expo-stack app uses React Navigation under the hood, including
        packages like native-stack and bottom-tabs that rely on react-native-screens for native
        view-controller behavior.
      </Text>
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
