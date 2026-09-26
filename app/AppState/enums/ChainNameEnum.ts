export enum ChainNameEnum {
  // SwarmMainnet, the live SWARM network, and what this build is for.
  // The chain LABEL: what the indexer reports in `GetLightdInfo.chain_name`,
  // what `chain_name_short` returns and what the settings file stores. It is
  // NOT what the Rust FFI takes: the chain HINT for this network carries the
  // genesis after a colon, and `nativeChainHint` in app/utils/networkProfiles.ts
  // is the one place a label becomes a hint.
  swarmMainnetChainName = 'swarm-mainnet',
  // SwarmTestnet, the engineering network, still selectable. A private
  // Zcash-derived proof-of-work TEST network using the standard Zcash testnet
  // transparent encodings and the `swarm1…` unified prefix; its coins have no
  // value. For this chain the label and the hint are the same string.
  swarmChainName = 'swarm-testnet',
  // The upstream Zcash chains are kept so the shared zingo-mobile code below
  // still type-checks, and so a wallet someone created on one before this
  // build can still be opened, named and have its seed exported. No
  // user-facing selector offers them.
  mainChainName = 'main',
  testChainName = 'test',
  regtestChainName = 'regtest',
  // Offline has no server and therefore no chain. This empty sentinel lets the
  // server keep a valid `chainName` type while carrying "no chain", the real
  // chain is derived from the wallet itself when opening offline.
  noneChainName = '',
}
