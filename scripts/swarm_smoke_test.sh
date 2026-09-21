#!/usr/bin/env bash
# SWARM Android smoke test.
#
# Installs the built APK on a running emulator, launches it, and asserts that
# it stays up and renders its first screen. It deliberately proves nothing
# about wallet behaviour: the SwarmTestnet indexer is not reachable from a CI
# runner, so the only network outcome available here is the unreachable-server
# path. What this does prove is that the native library loads on a real
# Android runtime — which is the failure this build is most likely to hit,
# because the wallet library is cross-compiled Rust behind UniFFI.
#
# Usage: scripts/swarm_smoke_test.sh <path to apk>

set -euo pipefail

APK="${1:?usage: swarm_smoke_test.sh <apk>}"
APP_ID="green.swarm.wallet"
OUT="smoke-out"
mkdir -p "$OUT"

echo "=== Emulator ==="
adb devices
adb shell getprop ro.build.version.sdk
adb shell getprop ro.product.cpu.abi

echo "=== Installing $APK ==="
adb install -r -g "$APK"

# A fresh log, so anything captured below belongs to this launch.
adb logcat -c || true

echo "=== Launching $APP_ID ==="
adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null

# The first launch unpacks the JS bundle and loads libuniffi_zingo.so. Give it
# room, then confirm the process is still alive rather than sampling once.
ALIVE=""
for _ in $(seq 1 30); do
  sleep 2
  PID="$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' || true)"
  if [ -n "$PID" ]; then
    ALIVE="$PID"
  fi
done

adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
adb shell screencap -p /sdcard/swarm-first-screen.png 2>/dev/null || true
adb pull /sdcard/swarm-first-screen.png "$OUT/first-screen.png" 2>/dev/null || true
adb shell dumpsys activity activities > "$OUT/activities.txt" 2>&1 || true

echo "=== Assertions ==="

if [ -z "$ALIVE" ]; then
  echo "FAIL: $APP_ID is not running after launch." >&2
  echo "--- last 200 log lines ---" >&2
  tail -200 "$OUT/logcat.txt" >&2 || true
  exit 1
fi
echo "ok: process alive (pid $ALIVE)"

# A native loader failure is the specific thing this test exists to catch, and
# it can happen without killing the process outright.
if grep -qE 'UnsatisfiedLinkError|dlopen failed|couldn.t find "libuniffi_zingo' "$OUT/logcat.txt"; then
  echo "FAIL: the native wallet library did not load." >&2
  grep -nE 'UnsatisfiedLinkError|dlopen failed|couldn.t find "libuniffi_zingo' "$OUT/logcat.txt" >&2 | head -20
  exit 1
fi
echo "ok: no native link errors"

if grep -qE "FATAL EXCEPTION|Process $APP_ID .*died|ANR in $APP_ID" "$OUT/logcat.txt"; then
  echo "FAIL: the app crashed or hung." >&2
  grep -nE "FATAL EXCEPTION|ANR in $APP_ID" -A20 "$OUT/logcat.txt" >&2 | head -60
  exit 1
fi
echo "ok: no fatal exception"

# React Native reports a JS-side crash as a red box rather than a process
# death, so check for it explicitly.
if grep -qE 'ReactNativeJS.*(Error|error):|No bundle URL present' "$OUT/logcat.txt"; then
  echo "FAIL: the JS bundle failed to run." >&2
  grep -nE 'ReactNativeJS' "$OUT/logcat.txt" >&2 | head -40
  exit 1
fi
echo "ok: the JS bundle ran"

# The first screen is rendered by MainActivity; a resumed activity in the
# dumpsys dump is the evidence that something is actually on screen.
if ! grep -q "$APP_ID" "$OUT/activities.txt"; then
  echo "FAIL: no $APP_ID activity in the activity dump." >&2
  exit 1
fi
echo "ok: the app's activity is on the stack"

if [ -s "$OUT/first-screen.png" ]; then
  echo "ok: captured the first screen ($(wc -c < "$OUT/first-screen.png") bytes)"
else
  echo "note: no screenshot captured (not fatal)"
fi

echo "=== SWARM smoke test passed ==="
