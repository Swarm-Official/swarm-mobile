#!/usr/bin/env node
// Fails if upstream branding reaches a user.
//
// This app is a fork. Keeping the MIT licence and crediting Zingo Mobile is
// required and correct; showing a user the word "Zingo" anywhere else is not.
// The desktop wallet shipped with "Zingo PC is locked" on its unlock screen,
// which is the exact failure this guards against.
//
// Reads the built artifact rather than the sources, because the sources are
// not what ships: the JS is bundled (Hermes bytecode, whose string table is
// still plain ASCII) and the Android string resources are compiled.
//
// Usage: node scripts/check_no_upstream_branding.mjs <path to apk>
//        node scripts/check_no_upstream_branding.mjs --sources

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Buffer } from 'node:buffer';
import { join } from 'node:path';

// Terms that must not reach a user outside the attribution allow-list below.
//
// Only the capitalised forms. Lowercase `zingo` in a compiled bundle is an
// identifier - a translation key, a symbol, a file name - and the instruction
// is explicitly to leave internal identifiers and storage keys alone. Text a
// user reads is capitalised.
const FORBIDDEN = ['Zingo', 'ZingoLabs', 'Zecwallet', 'zecwallet'];

// The only contexts in which upstream's name is allowed to survive.
//
// The first two are the attribution itself, which the licence requires and
// which should be visible. The rest are internal identifiers that never reach
// a screen: the Kotlin package of the forked sources, a dead enum value kept
// so stored settings keep parsing, and upstream repository URLs inside the
// bundled source map / licence text.
const ALLOWED = [
  /Based on Zingo Mobile by ZingoLabs \(MIT licence\)/,
  /The MIT License \(MIT\) Copyright \(c\) 2026 ZingoLabs/,
  /org\.ZingoLabs\.Zingo/,
  /Tip ZingoLabs/,
  /zingolabs\/zingo-?(mobile|lib)/i,
  /zingo-mobile/,
  // The uniffi-generated Kotlin/JS binding namespace, an internal symbol.
  /uniffi[._]zingo/i,
  /libuniffi_zingo/,
  /zingo_nym_proxy_ffi/,
];

const CONTEXT = 60;

// A compiled Hermes bundle carries a string table in which every JS identifier
// is stored as plain text, run together with no separators: `getZingoName`,
// `substituteZingoName`, `fetchZingolibVersionLock`, `TipZingoLabs`. Renaming
// those is explicitly out of scope, and they are not text anyone reads.
//
// What distinguishes a sentence from an identifier is what follows the word.
// Prose continues with a space or punctuation; camelCase continues with a
// letter. So in binary mode a hit only counts when the term ends a word.
// "Zingo PC is locked" is caught; "getZingoName" is not.
const ENDS_A_WORD = /[\s,.;:!?'")\]}—-]/;

function scan(buffer, label, { wholeWordOnly = false } = {}) {
  const text = buffer.toString('latin1');
  const problems = [];
  for (const term of FORBIDDEN) {
    let i = -1;
    while ((i = text.indexOf(term, i + 1)) !== -1) {
      if (wholeWordOnly) {
        const next = text[i + term.length];
        // End of buffer is ambiguous in a concatenated table; treat it as an
        // identifier rather than raise a hit nobody can act on.
        if (next === undefined || !ENDS_A_WORD.test(next)) continue;
      }
      const around = text.slice(
        Math.max(0, i - CONTEXT),
        Math.min(text.length, i + term.length + CONTEXT),
      );
      if (ALLOWED.some(rx => rx.test(around))) continue;
      problems.push({ label, term, around: around.replace(/[^\x20-\x7e]+/g, ' ').trim() });
    }
  }
  return problems;
}

function fail(problems) {
  console.error(`\nFAIL: upstream branding would reach a user (${problems.length} occurrence(s)):\n`);
  const seen = new Set();
  for (const p of problems) {
    const key = p.label + '|' + p.around;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`  [${p.label}] ...${p.around}...`);
  }
  console.error(
    '\nIf this is legitimate attribution, add it to ALLOWED in ' +
      'scripts/check_no_upstream_branding.mjs. Otherwise change the string.\n',
  );
  process.exit(1);
}

const arg = process.argv[2];

if (!arg || arg === '--sources') {
  // Source mode: the shipped translation files, which is where almost all
  // user-visible text lives. Cheap enough to run in the JS job, before the
  // ~40 minutes it takes to produce an APK.
  //
  // Only the VALUES are checked. A key like `info.zingolib` is an internal
  // identifier that no user sees, and renaming keys is explicitly out of
  // scope - what matters is the sentence it resolves to.
  const dir = 'app/translations';
  const problems = [];
  const values = node => {
    if (typeof node === 'string') return [node];
    if (Array.isArray(node)) return node.flatMap(values);
    if (node && typeof node === 'object') return Object.values(node).flatMap(values);
    return [];
  };
  for (const f of readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const parsed = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const v of values(parsed)) {
      problems.push(...scan(Buffer.from(v, 'utf8'), f));
    }
  }
  if (problems.length) fail(problems);
  console.log('ok: no upstream branding in the shipped translations');
  process.exit(0);
}

if (!existsSync(arg)) {
  console.error(`APK not found: ${arg}`);
  process.exit(2);
}

const work = mkdtempSync(join(tmpdir(), 'swarm-branding-'));
// unzip exits 11 when nothing matches the pattern, which is not an error
// worth failing a build over - the walk below simply finds nothing.
try {
  execFileSync('unzip', ['-o', '-q', arg, 'assets/*', '-d', work], { stdio: 'inherit' });
} catch (e) {
  if (e.status !== 11) throw e;
}

const problems = [];
const assets = join(work, 'assets');
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else problems.push(...scan(readFileSync(p), `apk:assets/${entry.name}`, { wholeWordOnly: true }));
  }
};
if (existsSync(assets)) walk(assets);

// The app label is a compiled resource, so read it back from the manifest.
try {
  const badging = execFileSync('aapt2', ['dump', 'badging', arg], { encoding: 'latin1' });
  const label = /application-label:'([^']*)'/.exec(badging);
  if (label) {
    console.log(`app label: ${label[1]}`);
    if (/zingo/i.test(label[1])) {
      problems.push({ label: 'apk:manifest', term: 'Zingo', around: `application-label '${label[1]}'` });
    }
  }
} catch {
  console.log('note: aapt2 unavailable, skipped the app-label check');
}

if (problems.length) fail(problems);
console.log('ok: no upstream branding in the APK beyond the attribution allow-list');
