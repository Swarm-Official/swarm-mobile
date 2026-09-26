/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@app/theme';

import { ChainNameEnum, TranslateType } from '@app/AppState';
import RegText from '@ui/primitives/RegText';

type ChainTypeToggleProps = {
  customServerChainName: string;
  onPress: (chain: ChainNameEnum) => void;
  translate: (key: string) => TranslateType;
  disabled?: boolean;
};

/**
 * The networks a custom server may be declared to serve.
 *
 * Only SWARM's two. Upstream Zcash's `main`, `test` and `regtest` used to be
 * here, and a user who typed a server address and then touched this control
 * could build a real Zcash wallet from a recovery phrase written down for
 * SWARM. That is what happened to the desktop wallet's first mainnet build.
 */
const CHAINS: {
  value: ChainNameEnum;
  key: string;
  testID: string;
}[] = [
  {
    value: ChainNameEnum.swarmMainnetChainName,
    key: 'swarm-mainnet',
    testID: 'settings.custom-server-chain.swarm-mainnet',
  },
  {
    value: ChainNameEnum.swarmChainName,
    key: 'swarm-testnet',
    testID: 'settings.custom-server-chain.swarm-testnet',
  },
];

const ChainTypeToggle: React.FunctionComponent<ChainTypeToggleProps> = ({
  customServerChainName,
  onPress,
  translate,
  disabled,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderAccent,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      {CHAINS.map(c => {
        const selected = customServerChainName === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            testID={c.testID}
            disabled={disabled}
            onPress={() => onPress(c.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: selected ? colors.bgAccent : 'transparent',
              borderRadius: 8,
              borderWidth: selected ? 1 : 0,
              borderColor: colors.borderAccent,
            }}
          >
            <RegText
              style={{
                color: selected ? colors.bgCanvas : colors.fgAccent,
                fontSize: 12,
              }}
            >
              {translate(`settings.value-chainname-${c.key}`) as string}
            </RegText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ChainTypeToggle;
