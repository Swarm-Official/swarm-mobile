#!/bin/bash
#
# string-sweep.sh — fail while a person can still see upstream branding in
# the built iOS app.
#
# Usage: bash ios/scripts/string-sweep.sh <path/to/Built.app>
#
# HOW THIS RELATES TO scripts/check_no_upstream_branding.mjs
#
# That script is the shared, cross-platform check and it is the source of
# truth for the shared JavaScript. This one runs it (in --sources mode)
# rather than reimplementing it, and then adds the two things it cannot
# reach:
#
#   * the iOS-native surfaces — the user-visible Info.plist keys and the
#     .strings / .storyboard / .xib resources. Its artifact mode unzips an
#     APK; there is no iOS equivalent in it.
#   * the terms it does not list. Its FORBIDDEN set is Zingo / ZingoLabs /
#     Zecwallet. "Zenny" — upstream's name for its 0.01 ZEC donation unit —
#     is not in it, so "Zenny Tips" and its four translations pass that
#     check while still being upstream donation branding on a screen.
#
# WHY THE BUNDLE RULE LOOKS ODD
#
# Hermes packs every string into one table with no separators, so `strings`
# returns megabyte-long runs and simple adjacency proves nothing:
# DEFAULT_DYNAMIC_SIZING followed by O_SEED_BIRTHDAY reads as "SIZINGO",
# and _getZenniesDonationAddress is a bridge method name, not a label.
# So a bundle hit only FAILS when the term is immediately followed by a
# space — a word inside a phrase, which is what a sentence looks like and
# what an identifier never does. Everything else is reported as advisory.
# Case matters for the same reason: user-visible text is capitalised,
# lowercase `zingo` in a bundle is an identifier, and the brief says to
# leave internal identifiers alone.
#
# Not swept, deliberately: Swift/ObjC comments, the React Native root
# module name, background-task identifiers, keychain service names,
# storage keys, the Xcode target/scheme/product name, and SDK symbols
# such as ZingolibError and zingoFFI.h.

set -uo pipefail

APP="${1:-}"
if [ -z "$APP" ] || [ ! -d "$APP" ]; then
    echo "usage: bash ios/scripts/string-sweep.sh <path/to/Built.app>" >&2
    exit 2
fi

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$IOS_DIR/.." && pwd)"

# Phrase-shaped: the term ends a word and a phrase continues after it.
PHRASE='(Zingo|ZingoLabs|Zenny|Zennies|Zecwallet) '
# Unambiguous regardless of shape.
ABSOLUTE='zingolabs\.org|support@zingolabs|Zcashexplorer|ZcashExplorer'
# Attribution, which is required to survive.
ALLOWED='Based on Zingo Mobile|MIT|[Cc]opyright|[Ll]icen[cs]e'

fails=0

echo "=============================================================="
echo "SWARM iOS user-visible string sweep"
echo "app: $APP"
echo "=============================================================="

# --------------------------------- 0. the shared check, not a copy of it
echo ""
echo "--- 0. shared translations (scripts/check_no_upstream_branding.mjs) ---"
if [ -f "$REPO_DIR/scripts/check_no_upstream_branding.mjs" ]; then
    if ( cd "$REPO_DIR" && node scripts/check_no_upstream_branding.mjs --sources ); then
        echo "ok: the shared check passes"
    else
        echo "FAIL: the shared check reports upstream branding in the translations"
        fails=$((fails + 1))
    fi
else
    echo "note: the shared check is not on this branch yet; skipped"
fi

# ---------------------------------------------------------------- 1. JS
echo ""
echo "--- 1. bundled JavaScript ---"
bundle=""
for candidate in "$APP/main.jsbundle" "$APP"/*.jsbundle; do
    if [ -f "$candidate" ]; then bundle="$candidate"; break; fi
done

if [ -z "$bundle" ]; then
    echo "NO JS BUNDLE FOUND in the app — a Release build must embed one."
    fails=$((fails + 1))
else
    echo "bundle: $bundle ($(wc -c < "$bundle" | tr -d ' ') bytes)"

    # -o keeps the match plus a little context, never the whole packed run.
    hard=$(strings -a "$bundle" \
        | grep -oE ".{0,45}(${PHRASE}|${ABSOLUTE}).{0,45}" \
        | grep -vE "$ALLOWED" | sort -u || true)
    n=$(printf '%s' "$hard" | grep -c . || true)
    if [ "$n" -gt 0 ]; then
        echo "FAIL: $n user-visible phrase(s) in the bundled JavaScript:"
        printf '%s\n' "$hard" | sed 's/^/    /'
        echo ""
        echo "  These are SHARED JavaScript (app/translations/*.json and the"
        echo "  screens that use them), not ios/. Fix once, for both platforms."
        fails=$((fails + 1))
    else
        echo "OK: no user-visible upstream phrase in the bundled JavaScript."
    fi

    soft=$(strings -a "$bundle" \
        | grep -oE ".{0,30}(Zingo|Zenny|Zennies).{0,30}" \
        | grep -vE "$ALLOWED" | sort -u | head -25 || true)
    if [ -n "$soft" ]; then
        echo ""
        echo "  advisory (NOT failing) — identifier-shaped, left alone by design:"
        printf '%s\n' "$soft" | sed 's/^/      /'
    fi
fi

# ------------------------------------------------------- 2. Info.plist
echo ""
echo "--- 2. Info.plist, user-visible keys only ---"
plist="$APP/Info.plist"
# NSPhotoLibraryUsageDescription and NSLocationWhenInUseUsageDescription are
# still listed although this build no longer declares them: an absent key is
# skipped below, and keeping it in the list means the sweep still reads it if
# it ever comes back.
for key in CFBundleDisplayName CFBundleName NSCameraUsageDescription \
           NSFaceIDUsageDescription NSPhotoLibraryUsageDescription \
           NSPhotoLibraryAddUsageDescription \
           NSLocationWhenInUseUsageDescription NSHumanReadableCopyright; do
    value=$(/usr/libexec/PlistBuddy -c "Print :$key" "$plist" 2>/dev/null || true)
    [ -z "$value" ] && continue
    if printf '%s' "$value" | grep -qE "${PHRASE}|${ABSOLUTE}" \
       && ! printf '%s' "$value" | grep -qE "$ALLOWED"; then
        echo "FAIL  $key = $value"
        fails=$((fails + 1))
    else
        echo "ok    $key = $value"
    fi
done

url_types=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleURLTypes' "$plist" 2>/dev/null || true)
if [ -n "$url_types" ]; then
    echo "FAIL  CFBundleURLTypes is present; this build must claim no URL scheme:"
    printf '%s\n' "$url_types"
    fails=$((fails + 1))
else
    echo "ok    CFBundleURLTypes absent — no zcash: claim"
fi

# -------------------------------------------- 3. iOS string resources
echo ""
echo "--- 3. iOS string resources in ios/ ---"
res=$(grep -rnE "${PHRASE}|${ABSOLUTE}" \
    --include='*.strings' --include='*.storyboard' --include='*.xib' \
    "$IOS_DIR" 2>/dev/null | grep -vE "$ALLOWED" | grep -v '/Pods/' || true)
n=$(printf '%s' "$res" | grep -c . || true)
if [ "$n" -gt 0 ]; then
    echo "FAIL: $n banned string(s) in iOS string resources:"
    printf '%s\n' "$res"
    fails=$((fails + 1))
else
    echo "OK: no banned string in .strings / .storyboard / .xib under ios/."
fi

echo ""
echo "=============================================================="
if [ "$fails" -gt 0 ]; then
    echo "STRING SWEEP FAILED in $fails area(s)."
    echo "=============================================================="
    exit 1
fi
echo "STRING SWEEP PASSED"
echo "=============================================================="
