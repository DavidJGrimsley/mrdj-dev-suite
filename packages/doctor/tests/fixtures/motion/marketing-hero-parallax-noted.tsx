// Motion budget: release build checked, keep parallax to four meaningful layers.
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ScrollView, Text, View } from 'react-native';

export function MarketingHeroParallaxNoted() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const skyLayer = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -24]) }],
  }));
  const mountainLayer = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -16]) }],
  }));
  const heroCopy = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 180], [0, -18]) }],
    opacity: interpolate(scrollY.value, [0, 180], [1, 0.88]),
  }));
  const pinnedBadge = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 140], [1, 0]),
  }));

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
      <View>
        <Animated.View style={skyLayer} />
        <Animated.View style={mountainLayer} />
        <Animated.View style={heroCopy}>
          <Text>Measured hero motion</Text>
        </Animated.View>
        <Animated.View style={pinnedBadge}>
          <Text>Parallax scene with a budget note</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
