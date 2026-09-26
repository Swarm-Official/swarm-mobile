import RPCModule from '@app/RPCModule';
import {
  ServerIdentity,
  ServerVerdict,
  checkServerIdentityForChain,
} from '@app/utils/serverIdentity';

/**
 * Ask the indexer which chain it serves, and refuse to work against it if the
 * answer is not the wallet's own chain.
 *
 * This runs twice for every payment: once before a sync, because blocks from
 * the wrong chain written into this wallet's state are someone else's history
 * in the user's wallet; and again immediately before a send, because a
 * transaction built against the wrong consensus rules and broadcast cannot be
 * taken back. The second check is not redundant with the first, the server
 * can be changed between them, and a custom URI typed into Settings is
 * exactly how it would be.
 *
 * A server that does not answer at all is a separate condition, already
 * surfaced by the existing unreachability paths; this gate only judges what a
 * server that DID answer said about itself.
 */

/** The chain the wallet is on could not be read from the server's answer. */
const UNREADABLE: ServerIdentity = {};

async function readServerIdentity(): Promise<ServerIdentity | undefined> {
  try {
    const infoStr = await RPCModule.infoServerInfo();
    if (!infoStr) {
      return undefined;
    }
    const parsed = JSON.parse(infoStr) as {
      chain_name?: string;
      server_uri?: string;
      genesis_hash?: string;
      error?: string;
    };
    if (parsed.error) {
      return undefined;
    }
    return {
      chain_name: parsed.chain_name,
      server_uri: parsed.server_uri,
      genesis_hash: parsed.genesis_hash,
    };
  } catch {
    // Unreachable, or an FFI rejection. Not this gate's business: the caller's
    // existing error paths already say the server could not be reached, and
    // accusing it of being the wrong chain would be a worse answer than the
    // true one.
    return undefined;
  }
}

/**
 * The verdict for the currently-open wallet on `chain`.
 *
 * `{ ok: true }` when the server could not be asked at all, so an offline or
 * unreachable server keeps behaving exactly as it did before this gate
 * existed. A server that answered and named a different chain is refused.
 */
export async function serverIdentityVerdict(
  chain: string | undefined,
): Promise<ServerVerdict> {
  const identity = await readServerIdentity();
  if (identity === undefined) {
    return { ok: true };
  }
  // An answer with no chain in it is a silent server, and that IS this gate's
  // business: it means the wallet cannot tell this server apart from one for
  // another network.
  return checkServerIdentityForChain(chain, identity ?? UNREADABLE);
}
