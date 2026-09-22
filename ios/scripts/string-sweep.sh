#!/bin/bash
#
# string-sweep.sh — fail the build if a USER-VISIBLE string in the built
# iOS app still says Zingo.
#
# Usage: bash ios/scripts/string-sweep.sh <path/to/Built.app>
#
# What it looks at, and only this:
#   1. the bundled JavaScript inside the .app (Hermes bytecode, read with
#      `strings`, which still carries the string table);
#   2. the user-visible keys of the app's Info.plist — the display name,
#      the bundle name, the permission prompts, any URL-scheme claim;
#   3. the iOS string resources — .strings, .storyboard, .xib text.
#
# What it deliberately does NOT look at, because the brief says not to
# rename internal identifiers and renaming them would break things:
#   - Swift/ObjC source comments and file headers;
#   - the React Native root module name registered in index.js;
#   - background-task identifiers, keychain service names, storage keys;
#   - the Xcode target, scheme and product name;
#   - symbol names from the SDK (ZingolibError, zingoFFI.h, …).
#
# Allow-list: licence and attribution text. Keeping the MIT notices and
# one honest line of provenance is required, not a leak.

set -uo pipefail

APP="${1:-}"
if [ -z "$APP" ] || [ ! -d "$APP" ]; then
    echo "usage: bash ios/scripts/string-sweep.sh <path/to/Built.app>" >&2
    exit 2
fi

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Strings that must not reach a person's screen.
BANNED='Zingo|ZINGO|zingolabs\.org|support@zingolabs|Zenny|Zennies|Zcashexplorer|ZcashExplorer'
# Lines that may legitimately contain them.
ALLOWED='MIT|[Cc]opyright|[Ll]icen[cs]e|Based on Zingo Mobile'

fails=0
report() { printf '%s\n' "$*"; }

report "=============================================================="
report "SWARM iOS user-visible string sweep"
report "app: $APP"
report "=============================================================="

# ---------------------------------------------------------------- 1. JS
report ""
report "--- 1. bundled JavaScript ---"
bundle=""
for candidate in "$APP/main.jsbundle" "$APP"/*.jsbundle; do
    if [ -f "$candidate" ]; then bundle="$candidate"; break; fi
done

if [ -z "$bundle" ]; then
    report "NO JS BUNDLE FOUND in the app — a Release build must embed one."
    fails=$((fails + 1))
else
    report "bundle: $bundle ($(wc -c < "$bundle" | tr -d ' ') bytes)"
    js_hits=$(strings -a "$bundle" | grep -nE "$BANNED" | grep -vE "$ALLOWED" || true)
    js_count=$(printf '%s' "$js_hits" | grep -c . || true)
    if [ "$js_count" -gt 0 ]; then
        report "FAIL: $js_count banned string(s) in the bundled JavaScript."
        report "These live in the SHARED JavaScript (app/translations/*.json and"
        report "the donation screens), not in ios/. They are the other agent's"
        report "to remove, once, for both platforms."
        report ""
        printf '%s\n' "$js_hits" | head -40
        [ "$js_count" -gt 40 ] && report "... and $((js_count - 40)) more"
        fails=$((fails + 1))
    else
        report "OK: no banned string in the bundled JavaScript."
    fi
fi

# ------------------------------------------------------- 2. Info.plist
report ""
report "--- 2. Info.plist, user-visible keys only ---"
plist="$APP/Info.plist"
for key in CFBundleDisplayName CFBundleName NSCameraUsageDescription \
           NSFaceIDUsageDescription NSPhotoLibraryUsageDescription \
           NSLocationWhenInUseUsageDescription NSHumanReadableCopyright; do
    value=$(/usr/libexec/PlistBuddy -c "Print :$key" "$plist" 2>/dev/null || true)
    [ -z "$value" ] && continue
    if printf '%s' "$value" | grep -qE "$BANNED" && ! printf '%s' "$value" | grep -qE "$ALLOWED"; then
        report "FAIL  $key = $value"
        fails=$((fails + 1))
    else
        report "ok    $key = $value"
    fi
done

url_types=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleURLTypes' "$plist" 2>/dev/null || true)
if [ -n "$url_types" ]; then
    report "FAIL  CFBundleURLTypes is present; this build must claim no URL scheme:"
    printf '%s\n' "$url_types"
    fails=$((fails + 1))
else
    report "ok    CFBundleURLTypes absent — no zcash: claim"
fi

# -------------------------------------------- 3. iOS string resources
report ""
report "--- 3. iOS string resources in ios/ ---"
res_hits=$(grep -rnE "$BANNED" \
    --include='*.strings' --include='*.storyboard' --include='*.xib' \
    "$IOS_DIR" 2>/dev/null | grep -vE "$ALLOWED" | grep -v '/Pods/' || true)
res_count=$(printf '%s' "$res_hits" | grep -c . || true)
if [ "$res_count" -gt 0 ]; then
    report "FAIL: $res_count banned string(s) in iOS string resources:"
    printf '%s\n' "$res_hits"
    fails=$((fails + 1))
else
    report "OK: no banned string in .strings / .storyboard / .xib under ios/."
fi

# --------------------------------------------------- advisory counters
report ""
report "--- advisory (NOT failing): chain vocabulary in the JS bundle ---"
report "Zcash / ZEC / TAZ can be legitimate in address-format help text, so"
report "these are counted and shown, never failed on. SWARM's ticker is SWM."
if [ -n "$bundle" ]; then
    for word in Zcash ZEC TAZ; do
        n=$(strings -a "$bundle" | grep -cE "\\b${word}\\b" || true)
        report "  $word: $n occurrence(s) in the bundle's string table"
    done
fi

report ""
report "=============================================================="
if [ "$fails" -gt 0 ]; then
    report "STRING SWEEP FAILED: $fails area(s) still show Zingo to a person."
    report "=============================================================="
    exit 1
fi
report "STRING SWEEP PASSED"
report "=============================================================="
