import { StyleSheet, Text, View } from 'react-native';

export function ExpositionNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.eyebrow}>Temporary exposition scaffold</Text>
      <Text style={styles.body}>These exposition pages are temporary developer and client-research scaffolds. Use them to evaluate styling, base packages, and data direction, then delete or prune them before production once the app direction is settled.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  eyebrow: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  body: {
    color: '#7c2d12',
    fontSize: 14,
    lineHeight: 20,
  },
});
