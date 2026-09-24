import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum, ScreenEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { useTheme } from '@app/theme';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import { getSwarmMark } from '@app/utils/ZingoAppData';
import {
  SavedWallet,
  savedWallets,
} from '@app/walletBackend/utils/savedWallets';
import Header from '@ui/widgets/Header';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';

type WalletsProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Wallets
> & {
  onSelect: (id: string) => Promise<void>;
};

export function Wallets({ navigation, onSelect }: WalletsProps) {
  const { translate, security, foregroundEpoch, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [wallets, setWallets] = useState<SavedWallet[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const selecting = useRef(false);
  const [error, setError] = useState('');
  const gate = useBiometricGate({
    needsAuth: security.changeWalletScreen,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: security.foregroundApp,
    foregroundEpoch,
  });

  useEffect(() => {
    if (gate.kind !== 'passed') return;
    let mounted = true;
    savedWallets().then(response => {
      if (!mounted) return;
      if (response.kind === 'error') setError(response.errorKey);
      else setWallets(response.wallets);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [gate.kind]);

  const select = async (id: string) => {
    if (selecting.current || loading) return;
    selecting.current = true;
    setBusy(true);
    try {
      await onSelect(id);
    } catch {
      setError('wallets.switch-error');
      setBusy(false);
      selecting.current = false;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <Header
        title={String(translate('wallets.title'))}
        screenName={ScreenEnum.Wallets}
        noBalance
        noSyncingStatus
        noDrawMenu
        noPrivacy
        closeScreen={() => navigation.goBack()}
      />
      {gate.kind === 'passed' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={getSwarmMark()} style={styles.mark} />
          <FadeText style={styles.description}>
            {String(translate('wallets.description'))}
          </FadeText>
          {!!error && <FadeText>{String(translate(error))}</FadeText>}
          {wallets.map(wallet => (
            <View
              key={wallet.id}
              style={[styles.wallet, { borderColor: colors.borderMuted }]}
            >
              <BoldText>{`${translate('wallets.wallet')} ${wallet.number}`}</BoldText>
              {wallet.active ? (
                <View accessible testID={`wallets.active.${wallet.number}`}>
                  <FadeText>{String(translate('wallets.active'))}</FadeText>
                </View>
              ) : (
                <Button
                  testID={`wallets.open.${wallet.number}`}
                  type={ButtonTypeEnum.Secondary}
                  title={String(translate('wallets.open'))}
                  disabled={busy}
                  onPress={() => select(wallet.id)}
                />
              )}
            </View>
          ))}
          {(busy || loading) && <ActivityIndicator color={colors.fgAccent} />}
          <Button
            testID="wallets.create"
            type={ButtonTypeEnum.Primary}
            title={String(translate('wallets.create'))}
            disabled={busy || loading || !!error}
            onPress={() => select('')}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 20 },
  mark: { width: 96, height: 45, resizeMode: 'contain', alignSelf: 'center' },
  description: { textAlign: 'center', lineHeight: 23 },
  wallet: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
});
