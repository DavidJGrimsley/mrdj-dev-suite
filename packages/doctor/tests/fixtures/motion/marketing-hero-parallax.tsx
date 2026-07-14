import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ScrollView, Text, View } from 'react-native';

export function MarketingHeroParallax() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const skyLayer = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -28]) }],
  }));
  const mountainLayer = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -18]) }],
  }));
  const cloudLayer = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -12]) }],
  }));
  const heroCopy = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 180], [0, -22]) }],
    opacity: interpolate(scrollY.value, [0, 180], [1, 0.82]),
  }));
  const pinnedBadge = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 140], [1, 0]),
    transform: [{ scale: interpolate(scrollY.value, [0, 180], [1, 1.04]) }],
  }));

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
      <View>
        <Animated.View style={skyLayer} />
        <Animated.View style={mountainLayer} />
        <Animated.View style={cloudLayer} />
        <Animated.View style={heroCopy}>
          <Text>Layered hero motion</Text>
        </Animated.View>
        <Animated.View style={pinnedBadge}>
          <Text>Parallax pinned depth scene</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
