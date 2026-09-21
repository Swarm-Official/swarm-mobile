export enum CurrencyNameEnum {
  /**
   * SwarmTestnet's coin. A TEST coin on a private proof-of-work network: it
   * has no value and cannot be bought, sold or exchanged.
   */
  SWM = 'SWM',
  /**
   * The upstream Zcash tickers. Kept so the shared zingo-mobile code still
   * type-checks; this build never reaches a chain that reports either.
   */
  ZEC = 'ZEC',
  TAZ = 'TAZ',
}

/**
 * The ticker a chain's coin goes by.
 *
 * This is the single place the mapping lives. Upstream derived it inline in
 * three separate files, which is three chances for a wallet to tell the user
 * it holds one coin while it holds another.
 */
export const currencyNameForChain = (
  chainName: string,
): CurrencyNameEnum => {
  switch (chainName) {
    case 'swarm-testnet':
      return CurrencyNameEnum.SWM;
    case 'main':
      return CurrencyNameEnum.ZEC;
    default:
      // Zcash testnet and regtest both use TAZ. Offline (the empty chain)
      // lands here too: this build only ever opens SwarmTestnet wallets, so
      // the caller overrides it with the wallet's own chain when it has one.
      return CurrencyNameEnum.TAZ;
  }
};
