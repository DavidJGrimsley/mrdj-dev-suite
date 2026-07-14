import Animated, { LinearTransition } from 'react-native-reanimated';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

export function ExpandingPanel() {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setOpen((value) => !value)}>
        <Text>Toggle details</Text>
      </Pressable>
      <Animated.View layout={LinearTransition}>
        {open ? <Text>Expanded detail content</Text> : <Text>Collapsed</Text>}
      </Animated.View>
    </View>
  );
}
