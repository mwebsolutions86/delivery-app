import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  // filter pointerEvents on web like in customer app
  const { pointerEvents, ...rest } = props as any;
  const forwardedProps = Platform.OS === 'web' ? rest : (props as any);

  return (
    <PlatformPressable
      {...forwardedProps}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
