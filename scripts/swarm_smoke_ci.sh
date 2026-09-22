#!/usr/bin/env bash
# CI entry point for the emulator smoke test.
#
# reactivecircus/android-emulator-runner executes its `script` input line by
# line, each line in its own `sh -c`, so a multi-line `if … fi` in the
# workflow dies with "Syntax error: end of file unexpected (expecting fi)"
# after the first line has already run (run 35739913127). Keeping the control
# flow in this file lets the workflow call a single line.
#
# Always checks the debug-signed APK; also checks the release-signed APK when
# the Play bundle job produced one (only possible with the upload key).
set -euo pipefail

DEBUG_APK="$(ls dist/*.apk 2>/dev/null | head -1 || true)"
if [ -z "$DEBUG_APK" ]; then
  echo "ERROR: no debug-signed APK under dist/" >&2
  exit 1
fi
bash scripts/swarm_smoke_test.sh "$DEBUG_APK" debug-signed

RELEASE_APK="$(ls dist-play/*.apk 2>/dev/null | head -1 || true)"
if [ -n "$RELEASE_APK" ]; then
  bash scripts/swarm_smoke_test.sh "$RELEASE_APK" release-signed
else
  echo "no release-signed APK in this run - only the debug-signed one was checked"
fi
