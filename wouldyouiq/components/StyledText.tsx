import { Text, TextProps } from './Themed';
import { Fonts } from '@/constants/tokens';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: Fonts.body }]} />;
}
