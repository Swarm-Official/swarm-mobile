export enum ChainNameEnum {
  // SwarmTestnet — the only chain a normal user of this wallet can reach.
  // The chain hint string the Rust FFI accepts, and what `chain_name_short`
  // returns. SWARM is a private Zcash-derived proof-of-work TEST network using
  // the standard Zcash testnet address encodings; its coins have no value.
  swarmChainName = 'swarm-testnet',
  // The upstream Zcash chains are kept so the shared zingo-mobile code below
  // still type-checks, but no user-facing selector offers them any more. They
  // are unreachable for a normal user.
  mainChainName = 'main',
  testChainName = 'test',
  regtestChainName = 'regtest',
  // Offline has no server and therefore no chain. This empty sentinel lets the
  // server keep a valid `chainName` type while carrying "no chain" — the real
  // chain is derived from the wallet itself when opening offline.
  noneChainName = '',
}
