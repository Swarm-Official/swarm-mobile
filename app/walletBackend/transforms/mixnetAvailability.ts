import { ChainNameEnum } from '@app/AppState';

// Is the Nym mixnet transport offered on this chain?
//
// **Not on SwarmTestnet, and the reason is honesty, not capability.** The
// "Enhanced Privacy" toggle, the Nym gate sheet and the mixnet status pill are
// all wired and all shipped. What has never been demonstrated is a send that
// travels through the mixnet to `lwd.swarm.green` and lands on SwarmTestnet:
// no build has done it, on any device, and nobody has watched it work.
//
// App Review guideline 2.1 treats a visible feature that fails as an
// incomplete app, and the project's own rule is not to show a person a switch
// whose effect nobody has verified. So the surfaces are gated off for this
// chain rather than deleted: the code stays, the tests stay, and one edit to
// the set below turns it back on the day a mixnet send is proven end to end
// against the live indexer.
//
// When that day comes: prove it first (a send from a real build, through the
// mixnet, confirmed on chain), record the evidence, then change this — and
// restore §4.2 of the privacy policy, which describes the mixnet and is
// removed while this returns false.
const MIXNET_CHAINS: readonly ChainNameEnum[] = [
  ChainNameEnum.mainChainName,
  ChainNameEnum.testChainName,
  ChainNameEnum.regtestChainName,
];

export const mixnetAvailableOnChain = (chainName: ChainNameEnum): boolean =>
  MIXNET_CHAINS.indexOf(chainName) !== -1;
