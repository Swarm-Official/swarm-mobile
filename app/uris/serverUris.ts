import { ServerUrisType, TranslateType, ChainNameEnum } from '@app/AppState';
import {
  SWARM_MAINNET_PROFILE,
  SWARM_TESTNET_PROFILE,
} from '@app/utils/networkProfiles';

// The servers this build ships, and the only ones it offers.
//
// SWARM has no public server registry: there is no third-party census of SWARM
// lightwalletd instances to rank or fall back to, and upstream zingo-mobile's
// twenty Zcash endpoints are gone — a wallet that offered them could put a
// SWARM recovery phrase on the public Zcash network, which is what happened to
// the desktop wallet's first mainnet build. A user who runs their own indexer
// types its URI into the custom-server field.
//
// SWARM Mainnet is first and is `default: true`, so a fresh install opens on
// the live network. The engineering testnet stays selectable, labelled for
// what it is; its coins have no value.
//
// `translate` is kept in the signature so every caller in the upstream
// zingo-mobile code still compiles — these entries have no region label.
const serverUris = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  translate: (key: string) => TranslateType | void,
): ServerUrisType[] => {
  return [
    // SWARM Mainnet — the live network, and the default.
    {
      uri: SWARM_MAINNET_PROFILE.defaultServer,
      region: '',
      chainName: ChainNameEnum.swarmMainnetChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    // SWARM Testnet — the engineering network. Coins here have no value.
    //
    // `default: true` as well: the flag means "the default server FOR THIS
    // CHAIN", which is how `defaultServerForChain` and `SettingsFileImpl` read
    // it. Which network a fresh install starts on is decided by the ORDER —
    // `serverUris()[0]` — not by this flag.
    {
      uri: SWARM_TESTNET_PROFILE.defaultServer,
      region: '',
      chainName: ChainNameEnum.swarmChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
  ];
};

export default serverUris;
