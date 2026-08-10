import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps {
  backgroundColor?: string;
  children?: ReactNode;
  label?: string;
  onPress?: () => void;
  textColor?: string;
}

export function AnimatedPressable({
  backgroundColor = '#111827',
  children,
  label = 'Reanimated press demo',
  onPress,
  textColor = '#ffffff',
}: AnimatedPressableProps) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.97 : 1, { duration: 120 }) }],
  }));

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[styles.button, { backgroundColor }, animatedStyle]}>
      {children ?? <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </AnimatedPressableBase>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
