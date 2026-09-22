/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';
import AppSheet from '@ui/primitives/AppSheet';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Header from '@ui/widgets/Header';
import DetailLine from '@ui/widgets/DetailLine';
import { RouteEnum, ScreenEnum } from '@app/AppState';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';
import RiskNotice from '@ui/widgets/RiskNotice';
import {
  LEGAL_LINKS,
  LegalLinkIdEnum,
  openLegalLink,
  type LegalLink,
} from '@app/legal';

type AboutProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.About>;

const About: React.FunctionComponent<AboutProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { zingolibVersion, translate } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.About;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [riskNoticeOpen, setRiskNoticeOpen] = useState<boolean>(false);
  const aboutSheetRef = useRef<BottomSheet>(null);

  // The risk notice is the one legal text that must be readable with no
  // network: it is the text the person acknowledged before their wallet
  // existed, and a wallet that cannot show it again is a wallet that asked
  // someone to agree to something they can no longer read. The other three
  // open the published pages in the system browser.
  const openLegal = useCallback((link: LegalLink) => {
    if (link.id === LegalLinkIdEnum.risks) {
      setRiskNoticeOpen(true);
      return;
    }
    openLegalLink(link.url);
  }, []);

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const aboutSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const aboutHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
      }}
    >
      <TouchableOpacity
        onPress={closeScreen}
        hitSlop={8}
        style={{ paddingHorizontal: 4, paddingVertical: 4 }}
      >
        <FontAwesomeIcon
          icon={faChevronLeft}
          size={20}
          color={colors.fgAccent}
        />
      </TouchableOpacity>
      <BoldText
        numberOfLines={1}
        style={{ flex: 1, fontSize: 16, lineHeight: 28, textAlign: 'center' }}
      >
        {getZingoName() + ' ' + getZingoVersion()}
      </BoldText>
      <View style={{ width: 28 }} />
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
      </View>
      <AppSheet
        ref={aboutSheetRef}
        snapPoints={aboutSnapPoints}
        header={aboutHeader}
      >
        <BottomSheetScrollView
          testID="about.scroll-view"
          bounces={false}
          alwaysBounceVertical={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            padding: 20,
          }}
        >
          <FadeText>{arrayTxt[0]}</FadeText>
          <DetailLine
            label={translate('info.zingolib') as string}
            value={zingolibVersion}
          />
          <View style={{ marginTop: 20 }}>
            {arrayTxt.map((txt: string, ind: number) => (
              <View key={txt.substring(0, 10)}>
                {ind !== 0 && (
                  <FadeText style={{ marginBottom: 20 }}>{txt}</FadeText>
                )}
              </View>
            ))}
          </View>

          {/* App Review guideline 5.1.1(i): the privacy policy has to be
              reachable from inside the app, not only from a store listing.
              The other three are here because the MIT licence this fork
              inherits requires the notices, and because a person who
              acknowledged the risk notice must be able to read it again. */}
          <View
            testID="about.legal"
            style={{
              marginTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.borderMuted,
              paddingTop: 16,
            }}
          >
            <BoldText style={{ fontSize: 15, marginBottom: 8 }}>
              {translate('about.legal') as string}
            </BoldText>
            {LEGAL_LINKS.map((link: LegalLink) => (
              <TouchableOpacity
                key={link.id}
                testID={'about.legal-' + link.id}
                accessibilityRole="link"
                accessibilityLabel={translate(link.labelKey) as string}
                onPress={() => openLegal(link)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 48,
                }}
              >
                <Text style={{ color: colors.fgAccent, fontSize: 15 }}>
                  {translate(link.labelKey) as string}
                </Text>
                {link.id !== LegalLinkIdEnum.risks && (
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    size={13}
                    color={colors.fgMuted}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetScrollView>
      </AppSheet>
      {riskNoticeOpen && (
        <RiskNotice
          mode="read"
          closeLabel={translate('close') as string}
          onDismiss={() => setRiskNoticeOpen(false)}
        />
      )}
    </View>
  );
};

export default About;
