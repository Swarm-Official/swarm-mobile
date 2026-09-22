/**
 * SWARM Wallet contacts no host but the wallet server the user chose
 * (privacy policy, section 4). @react-native-community/netinfo would break
 * that on its own: its default configuration answers "is the internet
 * reachable?" with a HEAD request to https://clients3.google.com/generate_204
 * at launch and then every 60 s, and on iOS the native side leaves that
 * question to the JS probe. app/services/netInfoPolicy.ts switches the probe
 * off. These tests drive the library's real reachability engine to prove the
 * switch holds, and pin the entry point that applies it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import NetInfo from '@react-native-community/netinfo';

import {
  SWARM_NETINFO_CONFIGURATION,
  applyNetInfoPolicy,
} from '@app/services/netInfoPolicy';

// The library's own engine and defaults, not this repository's jest mocks of
// the package (those only cover the package root and src/index).
const InternetReachability = jest.requireActual(
  '@react-native-community/netinfo/src/internal/internetReachability',
).default;
const DEFAULT_CONFIGURATION = jest.requireActual(
  '@react-native-community/netinfo/src/internal/defaultConfiguration',
).default;

// What iOS hands the JS side: connected, and no `isInternetReachable` at all
// (ios/RNCNetInfo.mm builds only type, isConnected and details). That is the
// exact shape that makes the library start its probe.
const iosConnectedState = {
  type: 'wifi',
  isConnected: true,
  details: { isConnectionExpensive: false },
};

describe('NetInfo reachability policy', () => {
  const realFetch = global.fetch;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    // A request that never answers: the tests assert on whether it is made.
    fetchSpy = jest.fn(() => new Promise(() => {}));
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  test('control: the library default sends the probe to Google', () => {
    const engine = new InternetReachability(DEFAULT_CONFIGURATION, jest.fn());
    engine.update(iosConnectedState);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://clients3.google.com/generate_204',
    );
    engine.tearDown();
  });

  test('with the SWARM policy the probe is never sent, however long the app runs', () => {
    const listener = jest.fn();
    const engine = new InternetReachability(
      { ...DEFAULT_CONFIGURATION, ...SWARM_NETINFO_CONFIGURATION },
      listener,
    );
    engine.update(iosConnectedState);

    // Every connectivity change and every refetch calls update() again; run
    // ten hours of them.
    for (let hour = 0; hour < 10; hour++) {
      jest.advanceTimersByTime(60 * 60 * 1000);
      engine.update({
        ...iosConnectedState,
        type: hour % 2 ? 'cellular' : 'wifi',
      });
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    // The one visible consequence, which nothing in the app reads.
    expect(listener).toHaveBeenLastCalledWith(false);
    engine.tearDown();
  });

  test('the policy touches the probe switch and nothing else', () => {
    expect(Object.keys(SWARM_NETINFO_CONFIGURATION)).toEqual([
      'reachabilityShouldRun',
    ]);
    expect(SWARM_NETINFO_CONFIGURATION.reachabilityShouldRun?.()).toBe(false);
  });

  test('applyNetInfoPolicy hands that configuration to the library', () => {
    const configure = NetInfo.configure as unknown as jest.Mock;
    configure.mockClear();

    applyNetInfoPolicy();

    expect(configure).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledWith(SWARM_NETINFO_CONFIGURATION);
  });

  test('the entry point applies the policy before the app is registered', () => {
    const entry = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
    const applied = entry.indexOf('applyNetInfoPolicy()');
    const registered = entry.indexOf('AppRegistry.registerComponent(');

    expect(applied).toBeGreaterThan(-1);
    expect(registered).toBeGreaterThan(applied);
  });
});
