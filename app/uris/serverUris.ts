import { ServerUrisType, TranslateType, ChainNameEnum } from '@app/AppState';

// SwarmTestnet has ONE project indexer and no public server registry: there is
// no third-party census of SWARM lightwalletd instances to rank or fall back
// to. This list is therefore the whole set of servers the app ships with; a
// user who runs their own indexer types its URI into the custom-server field.
// `translate` is kept in the signature so every caller in the upstream
// zingo-mobile code still compiles — the single entry has no region label.
const serverUris = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  translate: (key: string) => TranslateType | void,
): ServerUrisType[] => {
  return [
    // default (and only) server
    {
      uri: 'https://lwd.swarm.green:443',
      region: '',
      chainName: ChainNameEnum.swarmChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
  ];
};

export default serverUris;
