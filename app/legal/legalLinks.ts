import { Linking } from 'react-native';

// The legal pages, opened in the system browser from Settings → About.
//
// App Store Review guideline 5.1.1(i) requires the privacy policy to be
// reachable from inside the app; the MIT licence this fork inherits requires
// the notices; the risk notice is the project's own honesty rule. The first
// three open the website, the fourth is a screen inside the app because the
// notices must be readable with no network.
//
// THESE PAGES ARE NOT PUBLISHED YET. That is expected and is recorded rather
// than hidden: the wallet ships the links so the app side is finished and
// reviewable, and the website agent publishes the four pages from the drafts
// in the vault (`docs/ios/legal/`). Do not invent other URLs and do not point
// them at a placeholder host.

export enum LegalLinkIdEnum {
  privacy = 'privacy',
  terms = 'terms',
  risks = 'risks',
  notices = 'notices',
}

export type LegalLink = {
  readonly id: LegalLinkIdEnum;
  /** Key in `about.*` of the translation catalogues. */
  readonly labelKey: string;
  readonly url: string;
};

export const LEGAL_LINKS: readonly LegalLink[] = [
  {
    id: LegalLinkIdEnum.privacy,
    labelKey: 'about.privacy-policy',
    url: 'https://swarm.green/wallet/privacy',
  },
  {
    id: LegalLinkIdEnum.terms,
    labelKey: 'about.terms-of-use',
    url: 'https://swarm.green/wallet/terms',
  },
  {
    id: LegalLinkIdEnum.risks,
    labelKey: 'about.risk-notice',
    url: 'https://swarm.green/wallet/risks',
  },
  {
    id: LegalLinkIdEnum.notices,
    labelKey: 'about.open-source-notices',
    url: 'https://swarm.green/wallet/notices',
  },
];

export const legalLinkUrl = (id: LegalLinkIdEnum): string =>
  LEGAL_LINKS.filter(l => l.id === id)[0].url;

/**
 * Opens a legal page in the system browser.
 *
 * Never fatal: a device with no browser, or one that refuses the scheme, must
 * not take the About screen down with it. The risk notice is readable inside
 * the app regardless, which is what 5.1.1(i) actually needs.
 */
export const openLegalLink = async (url: string): Promise<void> => {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      console.log('cannot open legal link', url);
    }
  } catch (e) {
    console.log('cannot open legal link', url, e);
  }
};
