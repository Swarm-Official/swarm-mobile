#!/usr/bin/env bash
# Capture the screens Google Play will show, from the app the smoke test just
# installed on this emulator.
#
# Best effort by design. A store screenshot is evidence for a listing, not an
# assertion about the build: nothing here may fail the job, and whatever it
# manages to photograph is uploaded as an artifact for a human to look at. The
# app is launched, the wallet is given time to be created, and then the
# navigation drawer is walked — photographing each screen it reaches, and
# logging every label the UI actually exposes so the next run can be aimed
# better.
#
# The emulator CAN reach the wallet server (the smoke test's own check wrote
# 200 for https://lwd.swarm.green/status.json), so these are screens of a
# wallet that is really talking to SwarmTestnet.
#
# Usage: scripts/swarm_store_screens.sh [output dir]      (default: store-out)

set -uo pipefail

APP_ID="green.swarm.wallet"
OUT="${1:-store-out}"
mkdir -p "$OUT"

say() { echo "  $*"; }

# screencap straight to the host: no /sdcard round trip, no pull to fail.
shot() {
  local name="$1"
  if adb exec-out screencap -p > "$OUT/$name.png" 2>/dev/null && [ -s "$OUT/$name.png" ]; then
    say "captured $name.png ($(wc -c < "$OUT/$name.png") bytes)"
  else
    say "no capture for $name"
    rm -f "$OUT/$name.png"
  fi
}

ui_dump() {
  local file="$1"
  # uiautomator refuses to dump while the window is animating, so ask twice.
  adb shell uiautomator dump /sdcard/window_dump.xml >/dev/null 2>&1 \
    || adb shell uiautomator dump /sdcard/window_dump.xml >/dev/null 2>&1
  adb pull /sdcard/window_dump.xml "$file" >/dev/null 2>&1
  [ -s "$file" ]
}

# Tap the first node whose text OR content description contains $1.
ui_tap() {
  local needle="$1" dump="$OUT/ui-tap.xml" bounds x y
  ui_dump "$dump" || return 1
  bounds="$(python3 - "$needle" "$dump" <<'PY'
import re, sys
needle, path = sys.argv[1].lower(), sys.argv[2]
xml = open(path, encoding="utf-8", errors="replace").read()
for node in re.findall(r"<node[^>]*>", xml):
    text = (re.search(r'text="([^"]*)"', node) or [None, ""])[1]
    desc = (re.search(r'content-desc="([^"]*)"', node) or [None, ""])[1]
    if needle in text.lower() or needle in desc.lower():
        box = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node)
        if box:
            x1, y1, x2, y2 = (int(v) for v in box.groups())
            print((x1 + x2) // 2, (y1 + y2) // 2)
            break
PY
)"
  if [ -z "$bounds" ]; then
    say "'$1' is not on this screen"
    return 1
  fi
  # shellcheck disable=SC2086
  adb shell input tap $bounds >/dev/null 2>&1
  sleep 4
  return 0
}

echo "=== Store screens: is the app up? ==="
adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
for _ in $(seq 1 30); do
  sleep 2
  if [ -n "$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' || true)" ]; then break; fi
done
if [ -z "$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' || true)" ]; then
  say "the app is not running; nothing to capture"
  exit 0
fi

# Wallet creation and the first sync take a moment; the Receive screen appears
# as soon as the wallet exists.
say "waiting for the wallet to be created..."
sleep 60
shot "store-01-receive"
ui_dump "$OUT/ui-store-receive.xml" || true

echo "=== What the UI offers ==="
python3 - "$OUT" <<'PY'
import glob, re
labels = set()
for path in glob.glob(f"{__import__('sys').argv[1]}/ui-*.xml"):
    xml = open(path, encoding="utf-8", errors="replace").read()
    for node in re.findall(r"<node[^>]*>", xml):
        for attr in ("text", "content-desc"):
            match = re.search(f'{attr}="([^"]+)"', node)
            if match and match.group(1).strip():
                labels.add(match.group(1).strip())
for label in sorted(labels):
    print(f"  label: {label}")
PY

echo "=== Walking the navigation drawer ==="
for screen in "Open Menu Drawer" "History" "Send" "Messages" "Settings" "About" "Receive"; do
  if ui_tap "$screen"; then
    name="store-$(echo "$screen" | tr '[:upper:] ' '[:lower:]-')"
    shot "$name"
    ui_dump "$OUT/ui-$name.xml" || true
    # Back out of whatever opened, so the next label can be looked for.
    adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1 || true
    sleep 2
  fi
done

echo "=== Captured $(ls -1 "$OUT"/*.png 2>/dev/null | wc -l) screen(s) into $OUT ==="
exit 0
