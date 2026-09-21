import { ServerUrisType, ChainNameEnum } from '@app/AppState';

/**
 * SwarmTestnet has no public server census.
 *
 * Upstream zingo-mobile downloaded a community-run lightwalletd registry at
 * runtime (the zec.rocks "hosh" API) and used it to rank and pick servers.
 * That download is removed here, deliberately and permanently: SwarmTestnet
 * has exactly one project indexer, and the app must never ask a third party
 * which server to trust — a registry answer is an unauthenticated instruction
 * about where the wallet sends its view of the chain.
 *
 * The function keeps its name and signature so every caller still compiles.
 * It performs NO network request and always resolves to `[]`, which every
 * caller already treats as "registry unavailable" and answers by falling back
 * to the static `serverUris` list (the single SwarmTestnet indexer) or to the
 * user's own custom server. Never throws.
 */
const fetchServerList = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chainName: ChainNameEnum,
): Promise<ServerUrisType[]> => {
  return [];
};

export default fetchServerList;
