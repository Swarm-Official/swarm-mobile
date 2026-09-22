import AsyncStorage from '@react-native-async-storage/async-storage';

// The "Before you start" risk notice.
//
// This is a LEGAL text, not UI copy. It is reproduced here word for word from
// `docs/ios/legal/RISK-NOTICE.md` (section "Before you start") in the project
// vault, which is also the source of the page published at
// https://swarm.green/wallet/risks. One source, two renderings, so the app and
// the website cannot drift apart — if you change a word here, change it there
// in the same commit.
//
// It is deliberately NOT in app/translations/*.json:
//
//  * a translated legal notice is a different legal notice, and nobody here is
//    qualified to write the Spanish, Portuguese, Russian or Turkish version of
//    a liability disclaimer; and
//  * the translation catalogues are shared with Android and get edited for
//    tone. This text must not be edited for tone.
//
// `**…**` marks the lead-in of each paragraph and is rendered bold. There are
// no checkboxes: one acknowledgement is enough and reads as adult.

export const RISK_NOTICE_TITLE = 'Before you start';

export const RISK_NOTICE_PARAGRAPHS: readonly string[] = [
  '**SWARM is a test network.** SWM test coins have no value. Nobody sells them, and nobody should buy them. The network can be reset at any time and every balance with it.',
  '**Your recovery phrase is your wallet.** Write the 24 words down and keep them offline. Whoever has them controls your coins. If you lose them, nobody can recover your wallet, and that includes us. We will never ask for them.',
  '**Transactions cannot be undone.** Not by you, not by us, not by anyone. Check the address before you send.',
  '**Privacy has limits.** Shielded transactions hide sender, receiver and amount on the chain. They do not hide your internet address from the wallet server, and transparent ("t") addresses are public. The privacy software on this network is new and has not been independently audited.',
  '**The software is experimental.** It may have bugs that lose test coins, lose data or fail to sync. It is provided as is, without warranty.',
  '**You are responsible for your own laws.** Whether using cryptocurrency software is lawful where you live is yours to check.',
  '**Nothing here is advice.** Not financial, not legal, not tax.',
  '**No main network exists.** Nothing you hold or do on the test network gives you a right to anything on any future network, and no promise is made that one will exist.',
];

export const RISK_NOTICE_ACKNOWLEDGE = 'I understand';

// Versioned on purpose. If the notice ever changes materially, bump the
// suffix and every installation is asked again rather than silently treated
// as having read something it never saw.
export const RISK_NOTICE_STORAGE_KEY = '@risk-notice-acknowledged-v1';

/**
 * Whether this installation has acknowledged the risk notice.
 *
 * A storage read that throws answers `false`: showing the notice twice is a
 * small annoyance, letting a first wallet be created without it is the thing
 * this exists to prevent.
 */
export const hasAcknowledgedRiskNotice = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(RISK_NOTICE_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
};

/** Records the acknowledgement. A failed write only means it is asked again. */
export const acknowledgeRiskNotice = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RISK_NOTICE_STORAGE_KEY, 'true');
  } catch {
    // Nothing to do and nothing to report: the notice is shown again next
    // launch, which is the safe direction to fail in.
  }
};
