import Svg, { Circle, Path } from 'react-native-svg';

export function SvgMark() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44" accessibilityRole="image">
      <Circle cx={22} cy={22} r={20} fill="#111827" />
      <Path d="M14 23.5 19.5 29 31 15" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
