import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface GestureCardProps {
  title: string;
  body: string;
}

export function GestureCard({ title, body }: GestureCardProps) {
  const offset = useSharedValue(0);
  const pan = Gesture.Pan()
    .onChange((event) => {
      offset.value = event.translationX;
    })
    .onFinalize(() => {
      offset.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, style]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.08)',
  },
  title: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
