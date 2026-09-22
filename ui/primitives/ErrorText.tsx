import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';
import { fontFamily } from '@app/theme/typography';

type ErrorTextProps = {
  style?: TextStyle;
  children: string;
  testID?: string;
  selectable?: boolean;
};

const ErrorText: React.FunctionComponent<ErrorTextProps> = ({
  style,
  children,
  testID,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      testID={testID}
      style={{
        fontFamily: fontFamily.bodyMedium,
        color: colors.fgDanger,
        ...style,
      }}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

export default ErrorText;
