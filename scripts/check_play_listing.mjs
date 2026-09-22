#!/usr/bin/env node
// Fails if the Play listing would be rejected at upload, or still reads as
// upstream's app.
//
// Google Play truncates nothing: a title of 31 characters is refused at
// upload, after the build. The limits are cheap to assert here, and the
// forbidden wording is the same class of mistake the APK branding check
// guards against, one step earlier in the funnel.
//
// Usage: node scripts/check_play_listing.mjs

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'fastlane/metadata/android';
const LOCALES = ['en-US', 'es'];

const LIMITS = {
  'title.txt': 30,
  'short_description.txt': 80,
  'full_description.txt': 4000,
};

// This app is not Zingo and is not a Zcash wallet. Either phrase in a store
// listing is a trademark problem and a false description of the network.
const FORBIDDEN = [/Zingo/i, /Zcash wallet/i];

// The attribution the MIT licence requires, and the disclaimer naming the
// projects this one is not.
const ALLOWED = [
  /fork of Zingo, an MIT-licensed wallet/,
  /bifurcación de Zingo, una billetera con licencia MIT/,
  /Zingo Labs, Foursquare/,
  /Zingo Labs, la aplicación Swarm/,
];

const problems = [];

for (const locale of LOCALES) {
  const dir = join(ROOT, locale);
  if (!existsSync(dir)) {
    problems.push(`${locale}: the locale directory is missing`);
    continue;
  }

  for (const [name, limit] of Object.entries(LIMITS)) {
    const path = join(dir, name);
    if (!existsSync(path)) {
      problems.push(`${locale}/${name}: missing`);
      continue;
    }
    const text = readFileSync(path, 'utf8').trim();
    if (!text) {
      problems.push(`${locale}/${name}: empty`);
      continue;
    }
    if (text.length > limit) {
      problems.push(`${locale}/${name}: ${text.length} characters, Play allows ${limit}`);
    } else {
      console.log(`  ok ${locale}/${name} ${text.length}/${limit}`);
    }
    problems.push(...branding(`${locale}/${name}`, text));
  }

  const changelogs = join(dir, 'changelogs');
  if (!existsSync(changelogs)) {
    problems.push(`${locale}/changelogs: missing`);
    continue;
  }
  const entries = readdirSync(changelogs).filter(n => n.endsWith('.txt'));
  if (!entries.length) {
    problems.push(`${locale}/changelogs: no changelog for any versionCode`);
  }
  for (const entry of entries) {
    const text = readFileSync(join(changelogs, entry), 'utf8').trim();
    if (text.length > 500) {
      problems.push(`${locale}/changelogs/${entry}: ${text.length} characters, Play allows 500`);
    } else {
      console.log(`  ok ${locale}/changelogs/${entry} ${text.length}/500`);
    }
    problems.push(...branding(`${locale}/changelogs/${entry}`, text));
  }
}

function branding(label, text) {
  const hits = [];
  for (const rx of FORBIDDEN) {
    const found = text.match(new RegExp(rx.source, 'gi'));
    if (!found) continue;
    for (const hit of found) {
      const at = text.indexOf(hit);
      const around = text.slice(Math.max(0, at - 60), at + hit.length + 60);
      if (ALLOWED.some(a => a.test(around))) continue;
      hits.push(`${label}: upstream wording "${hit}" in ...${around.replace(/\s+/g, ' ')}...`);
    }
  }
  return hits;
}

if (problems.length) {
  console.error(`\nFAIL: the Play listing has ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('ok: the Play listing fits Google Play and carries no upstream wording');
