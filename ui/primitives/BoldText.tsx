import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';
import { fontFamily } from '@app/theme/typography';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
  testID?: string;
  selectable?: boolean;
  numberOfLines?: number;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
  numberOfLines,
}) => {
  const { colors } = useTheme();
  const totalStyle: TextStyle = {
    color: colors.fgDefault,
    // Sora is the display face. Emphasis comes from the family name, so the
    // `fontWeight: 'bold'` upstream set here would be ignored on Android.
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 16,
    opacity: 0.87,
    ...style,
  };

  return (
    <Text
      testID={testID}
      style={totalStyle}
      selectable={selectable}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

export default BoldText;
