import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';

// Reverse of the split-APK encoding in android/app/build.gradle.kts:
// `versionCode = abi * 10000 + build`. Universal APK and AAB-derived
// Play installs have no ABI prefix (raw < 10000).
const ABI_BY_PREFIX: Record<number, string> = {
  1: 'arm-v7a',
  2: 'x86',
  3: 'arm64-v8a',
  4: 'x86_64',
};

/**
 * Human-facing app version, e.g. "2.0.19 (308)" or
 * "2.0.19 (308, arm64-v8a)" when the install came from a split APK.
 *
 * Reads from the native binary at runtime so it reflects the channel the user
 * actually installed (prod vs beta), independent of the JS bundle.
 */
export function getZingoVersion(): string {
  const raw = Number(getBuildNumber());
  if (!Number.isFinite(raw)) {
    return `${getVersion()} (${getBuildNumber()})`;
  }
  const prefix = Math.floor(raw / 10000);
  const build = raw % 10000;
  const abi = ABI_BY_PREFIX[prefix];
  return abi
    ? `${getVersion()} (${build}, ${abi})`
    : `${getVersion()} (${build})`;
}

/**
 * Display name of the running app, e.g. "SWARM Wallet".
 *
 * Reads CFBundleDisplayName (iOS) / app_name resource (Android) at runtime so
 * the in-app UI matches the springboard label of the installed binary.
 */
export function getZingoName(): string {
  return getApplicationName();
}

/**
 * The SWARM hive-bee, for the places React Native needs a bitmap rather than
 * a component: the header, the start menu and the middle of a QR code.
 *
 * Its stripes are transparent holes rather than painted, so the mark sits
 * correctly on the warm-black canvas and on the QR code's wax plate alike -
 * which is what the design system means by "stripes always take the
 * background colour". Metro picks the density variant.
 *
 * There is no per-channel variant, and that is the fix rather than an
 * omission. Upstream picked between a production and a beta logo by comparing
 * the running app's name against a hard-coded upstream beta name - a string
 * that stopped being true the moment this app was renamed, so the beta build
 * would silently have taken the production branch forever. The two channels
 * differ by name; one mark serves both, and there is no comparison left to go
 * stale.
 */
const SWARM_MARK = require('../../assets/img/swarm-bee.png');

export function getSwarmMark() {
  return SWARM_MARK;
}

/**
 * Substitute `{name}` placeholder with the runtime app name in any translation
 * result. Designed to be called from the `translate` wrapper so every i18n
 * lookup transparently picks up the beta name when running the beta variant.
 *
 * Handles strings, arrays and nested objects via a single JSON round-trip,
 * skipped when no `{name}` placeholder is present (the common case).
 */
export function substituteZingoName<T>(value: T): T {
  if (typeof value === 'string') {
    return value.includes('{name}')
      ? (value.replaceAll('{name}', getZingoName()) as unknown as T)
      : value;
  }
  const serialized = JSON.stringify(value);
  if (!serialized || !serialized.includes('{name}')) {
    return value;
  }
  return JSON.parse(serialized.replaceAll('{name}', getZingoName())) as T;
}
