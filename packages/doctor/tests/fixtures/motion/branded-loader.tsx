import LottieView from 'lottie-react-native';
import { Text, View } from 'react-native';

const animationSource = {} as never;

export function BrandedLoader() {
  return (
    <View>
      <LottieView autoPlay loop source={animationSource} />
      <Text>Loading your workspace</Text>
    </View>
  );
}
