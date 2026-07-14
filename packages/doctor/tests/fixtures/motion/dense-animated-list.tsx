import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Text, View } from 'react-native';

const rows = Array.from({ length: 8 }, (_, index) => ({ id: index, title: `Row ${index + 1}` }));

export function DenseAnimatedList() {
  return (
    <View>
      {rows.map((row) => (
        <Animated.View
          key={row.id}
          entering={FadeIn}
          exiting={FadeOut}
          layout={LinearTransition}
        >
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
            <Text>{row.title}</Text>
          </Animated.View>
        </Animated.View>
      ))}
    </View>
  );
}
