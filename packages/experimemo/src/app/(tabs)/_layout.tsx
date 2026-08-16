import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAppTheme } from '../../theme/provider';

export default function TabsLayout() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const tabContentStyle = {
    backgroundColor: colors.background,
  };

  return (
    <NativeTabs
      backgroundColor={colors.background}
      disableTransparentOnScrollEdge
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index" contentStyle={tabContentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={'house.fill' as any} md={'home' as any} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="exposition"
        contentStyle={tabContentStyle}
        disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={'shippingbox.fill' as any} md={'deployed_code' as any} />
        <NativeTabs.Trigger.Label>Exposition</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="stylist"
        contentStyle={tabContentStyle}
        disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={'paintpalette.fill' as any} md={'palette' as any} />
        <NativeTabs.Trigger.Label>Stylist</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="data" contentStyle={tabContentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={'externaldrive.fill' as any} md={'database' as any} />
        <NativeTabs.Trigger.Label>Data</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="sdk-56"
        contentStyle={tabContentStyle}
        disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={'sparkles.rectangle.stack.fill' as any}
          md={'rocket_launch' as any}
        />
        <NativeTabs.Trigger.Label>SDK 56</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
