import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';
import { fontFamily } from '@app/theme/typography';

type FadeTextProps = {
  style?: TextStyle;
  children: string | string[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
};

const FadeText: React.FunctionComponent<FadeTextProps> = ({
  style,
  children,
  numberOfLines,
  ellipsizeMode,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={{
        fontFamily: fontFamily.bodyRegular,
        color: colors.fgMuted,
        ...style,
      }}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

export default FadeText;
