import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PanResponder, Text } from 'react-native';

export function DraggableSheet() {
  const translateY = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_event, gesture) => {
      translateY.value = gesture.dy;
    },
    onPanResponderRelease: () => {
      translateY.value = withSpring(0);
    },
  });

  return (
    <Animated.View style={style} {...panResponder.panHandlers}>
      <Text>Gesture driven sheet</Text>
    </Animated.View>
  );
}
