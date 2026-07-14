import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text, View } from 'react-native';

export default function SimpleRouteFades() {
  return (
    <View>
      <Animated.View entering={FadeIn}>
        <Text>Welcome</Text>
      </Animated.View>
      <Animated.View exiting={FadeOut}>
        <Text>Route copy fades only once</Text>
      </Animated.View>
    </View>
  );
}
