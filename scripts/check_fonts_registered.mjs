#!/usr/bin/env node
// Fails if a font the code asks for is not actually shipped and registered.
//
// This is the failure that does not announce itself. A `fontFamily` naming a
// face the bundle does not contain does not error, does not warn and does not
// crash: the text simply renders in the system font and the build stays green.
// It happened on iOS - the three SWARM typefaces were declared in styles but
// absent from the app bundle - and the Android side had the same bug for a
// commit, so this checks every link in the chain at once:
//
//   1. app/theme/typography.ts  - the family names the code asks for
//   2. assets/fonts/*.ttf       - the files that exist
//   3. react-native.config.js   - the Android asset-linking declaration
//   4. android/app/build.gradle.kts - the task that stages them into the APK
//   5. ios/Zingo/Info.plist     - UIAppFonts, read only, never written here
//
// Checking 5 from the Android side is deliberate: the fonts are shared code,
// and a per-platform check is exactly how the two drift apart.

import { readFileSync, readdirSync, existsSync } from 'node:fs';

const problems = [];
const note = m => console.log(`  ${m}`);

// 1. What the code asks for.
const typography = readFileSync('app/theme/typography.ts', 'utf8');
const asked = [...typography.matchAll(/^\s*\w+:\s*'([A-Za-z0-9-]+)',/gm)].map(m => m[1]);
if (asked.length === 0) {
  problems.push('app/theme/typography.ts declares no font families - has it moved?');
}

// 2. What exists.
const shipped = existsSync('assets/fonts')
  ? readdirSync('assets/fonts').filter(f => f.endsWith('.ttf')).map(f => f.replace(/\.ttf$/, ''))
  : [];

note(`typography.ts asks for ${asked.length}: ${asked.join(', ')}`);
note(`assets/fonts ships ${shipped.length}: ${shipped.join(', ')}`);

for (const family of asked) {
  if (!shipped.includes(family)) {
    problems.push(
      `typography.ts asks for "${family}" but assets/fonts/${family}.ttf does not exist. ` +
        `On Android a fontFamily resolves to the bundled FILE name, so this would ` +
        `silently fall back to the system face.`,
    );
  }
}

// Any fontFamily written as a literal anywhere must also be a shipped family.
// `monospace` and `System` are the platform's own and are allowed.
const PLATFORM_FACES = new Set(['monospace', 'System', 'Courier']);
const sources = [];
const walk = dir => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) sources.push(p);
  }
};
for (const d of ['app', 'screens', 'ui']) if (existsSync(d)) walk(d);

for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/fontFamily:\s*'([^']+)'/g)) {
    const face = m[1];
    if (PLATFORM_FACES.has(face) || shipped.includes(face)) continue;
    problems.push(`${file} sets fontFamily: '${face}', which is neither shipped nor a platform face.`);
  }
}

// 3. Android asset linking is declared.
const rnConfig = existsSync('react-native.config.js')
  ? readFileSync('react-native.config.js', 'utf8')
  : '';
if (!/assets\s*:\s*\[[^\]]*assets\/fonts/.test(rnConfig)) {
  problems.push("react-native.config.js does not list './assets/fonts' in `assets`.");
} else {
  note('react-native.config.js declares ./assets/fonts');
}

// 4. And something actually stages them, because the React Native Gradle
//    plugin does not act on that declaration by itself.
const gradle = readFileSync('android/app/build.gradle.kts', 'utf8');
if (!/stageSwarmFonts/.test(gradle)) {
  problems.push(
    'android/app/build.gradle.kts has no stageSwarmFonts task. react-native.config.js ' +
      'alone does NOT put fonts in the APK - the plugin ignores that field.',
  );
} else {
  note('build.gradle.kts stages the fonts into the APK assets');
}

// 5. iOS registration, read only. If the key is absent the iOS side has not
//    wired fonts yet and that is their call; if it is present it must agree.
const plist = 'ios/Zingo/Info.plist';
if (existsSync(plist)) {
  const text = readFileSync(plist, 'utf8');
  const block = /<key>UIAppFonts<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(text);
  if (!block) {
    note('ios Info.plist has no UIAppFonts yet - not checked');
  } else {
    const ios = [...block[1].matchAll(/<string>(?:fonts\/)?([^<]+?)\.ttf<\/string>/g)].map(m => m[1]);
    const missingOnIos = shipped.filter(f => !ios.includes(f));
    const extraOnIos = ios.filter(f => !shipped.includes(f));
    if (missingOnIos.length || extraOnIos.length) {
      problems.push(
        `ios/Zingo/Info.plist UIAppFonts has drifted from assets/fonts. ` +
          `Missing on iOS: [${missingOnIos.join(', ') || 'none'}]. ` +
          `Listed on iOS but not shipped: [${extraOnIos.join(', ') || 'none'}].`,
      );
    } else {
      note(`ios Info.plist registers the same ${ios.length} faces`);
    }
  }
}

if (problems.length) {
  console.error(`\nFAIL: font registration is broken (${problems.length}):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('ok: every font the code asks for is shipped and registered on both platforms');
