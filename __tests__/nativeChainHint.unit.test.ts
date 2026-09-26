/**
 * The chain HINT the Rust library takes is not the chain LABEL the app stores.
 *
 * For `main`, `test`, `regtest` and `swarm-testnet` the two are the same
 * string, which is why every call site in this app passed a label and nothing
 * noticed for four years. For SWARM production they differ:
 * `ChainType::SwarmMainnet` carries the genesis and the SDK gives it no
 * default, so `swarm-mainnet` on its own is refused by the library with
 * "'swarm-mainnet' does not name a network".
 *
 * The desktop wallet shipped 0.1.0-mainnet.1 with a `chainHintFor` that was
 * written, documented, unit-tested, and called by nothing. The owner pressed
 * Create and could not make a wallet. A unit test of the builder alone would
 * have passed on that build.
 *
 * So half of this file is a SOURCE SCAN: it reads the app's own source and
 * fails the build if any file reaches the four wallet-opening FFI methods
 * without going through `nativeChainHint`. The other half tests the builder.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';

import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import {
  SWARM_MAINNET_GENESIS,
  SWARM_MAINNET_PROFILE,
  SWARM_TESTNET_PROFILE,
  chainHintFor,
  nativeChainHint,
  swarmProfileFor,
  withoutGenesis,
} from '@app/utils/networkProfiles';

const REPO_ROOT = path.resolve(__dirname, '..');

/** Every source directory a call to the FFI could hide in. */
const SOURCE_DIRS = ['app', 'screens', 'ui'];

/**
 * The wallet-opening FFI methods. Each takes a chain hint, and each is how a
 * wallet gets bound to a chain for the rest of its life.
 */
const CHAIN_TAKING_FFI = [
  'createNewWallet',
  'restoreWalletFromSeed',
  'restoreWalletFromUfvk',
  'loadExistingWallet',
];

/**
 * The only two files allowed to name those methods on `RPCModule`:
 * the bridge declaration, and the one wrapper module that builds the hint.
 */
const ALLOWED_DIRECT_CALLERS = [
  path.join('app', 'RPCModule', 'RPCModule.ts'),
  path.join('app', 'walletBackend', 'utils', 'walletUtils.ts'),
];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') {
          continue;
        }
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  for (const dir of SOURCE_DIRS) {
    walk(path.join(REPO_ROOT, dir));
  }
  return out;
}

describe('the FFI chain-hint boundary', () => {
  test('nothing but the wrapper calls the wallet-opening FFI methods', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const relative = path.relative(REPO_ROOT, file);
      if (ALLOWED_DIRECT_CALLERS.includes(relative)) {
        continue;
      }
      const source = fs.readFileSync(file, 'utf8');
      for (const method of CHAIN_TAKING_FFI) {
        if (source.includes(`RPCModule.${method}(`)) {
          offenders.push(`${relative}: RPCModule.${method}(`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the wrapper builds every hint with nativeChainHint', () => {
    const wrapper = fs.readFileSync(
      path.join(REPO_ROOT, 'app', 'walletBackend', 'utils', 'walletUtils.ts'),
      'utf8',
    );
    expect(wrapper).toContain(
      "import { nativeChainHint } from '@app/utils/networkProfiles';",
    );

    // One `const chainHint = nativeChainHint(chain);` per wallet-opening
    // wrapper, and no wrapper still taking a pre-built hint from its caller.
    const built = wrapper.match(/const chainHint = nativeChainHint\(chain\);/g);
    expect(built).toHaveLength(CHAIN_TAKING_FFI.length);

    for (const method of CHAIN_TAKING_FFI) {
      // Each exported wrapper takes a chain LABEL from its caller. A wrapper
      // still declaring `chainHint: string` would be taking a pre-built hint
      // from a caller that cannot build one. (`applyBroadcastCandidates`, a
      // private helper further down the file, does take a real hint and is
      // not one of these.)
      const declaration = wrapper.slice(
        wrapper.indexOf(`export async function ${method}(`),
      );
      const signature = declaration.slice(0, declaration.indexOf('): Promise'));
      expect(signature).toContain('chain: string,');
      expect(signature).not.toContain('chainHint: string,');

      // And each passes the built variable on, rather than something else
      // that happens to be in scope.
      const call = wrapper.slice(wrapper.indexOf(`RPCModule.${method}(`));
      const args = call.slice(0, call.indexOf(')'));
      expect(args).toContain('chainHint');
    }
  });
});

describe('nativeChainHint', () => {
  test('SWARM production is opened with its genesis, never the bare label', () => {
    const hint = nativeChainHint(ChainNameEnum.swarmMainnetChainName);
    expect(hint).toBe(`swarm-mainnet:${SWARM_MAINNET_GENESIS}`);
    expect(hint).not.toBe(ChainNameEnum.swarmMainnetChainName);
    expect(hint.split(':')[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  test('the engineering testnet hint is its label, as the library expects', () => {
    expect(nativeChainHint(ChainNameEnum.swarmChainName)).toBe(
      'swarm-testnet',
    );
  });

  test("upstream Zcash's chains pass through untouched", () => {
    for (const chain of ['main', 'test', 'regtest', 'regtest:1,2,3']) {
      expect(nativeChainHint(chain)).toBe(chain);
    }
  });

  test('an absent chain becomes the empty string, not "undefined"', () => {
    expect(nativeChainHint(undefined)).toBe('');
    expect(nativeChainHint(null)).toBe('');
    expect(nativeChainHint('')).toBe('');
  });

  test('a profile with no genesis throws instead of yielding a hint', () => {
    // Not the shipped profile: `withoutGenesis` makes a copy, so nothing here
    // can make the real production profile unselectable.
    expect(() => chainHintFor(withoutGenesis(SWARM_MAINNET_PROFILE))).toThrow(
      /has not launched yet/,
    );
  });

  test('the two SWARM labels resolve, and the word "mainnet" does not', () => {
    expect(swarmProfileFor('swarm-mainnet')).toBe(SWARM_MAINNET_PROFILE);
    expect(swarmProfileFor('swarm-testnet')).toBe(SWARM_TESTNET_PROFILE);
    for (const notSwarm of ['main', 'mainnet', 'test', 'regtest', 'swarm']) {
      expect(swarmProfileFor(notSwarm)).toBeUndefined();
    }
  });
});

describe('the embedded genesis', () => {
  test('the TypeScript and Rust copies are the same string', () => {
    const rust = fs.readFileSync(
      path.join(REPO_ROOT, 'rust', 'lib', 'src', 'lib.rs'),
      'utf8',
    );
    const match = rust.match(
      /pub const SWARM_MAINNET_GENESIS: &str =\s*"([0-9a-f]{64})";/,
    );
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(SWARM_MAINNET_GENESIS);
  });

  test('the mainnet indexer is the same in both layers', () => {
    const rust = fs.readFileSync(
      path.join(REPO_ROOT, 'rust', 'lib', 'src', 'lib.rs'),
      'utf8',
    );
    expect(rust).toContain(
      `pub const SWARM_MAINNET_SERVER_URI: &str = "${SWARM_MAINNET_PROFILE.defaultServer}";`,
    );
  });
});
