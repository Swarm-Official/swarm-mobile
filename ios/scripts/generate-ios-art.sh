#!/bin/bash
#
# generate-ios-art.sh — render every iOS PNG from the committed SVG.
#
# Source of truth:  ios/branding/swarm-appicon.svg
# Written:          ios/Zingo/Images.xcassets/AppIcon-Prod.appiconset/*.png
#                   ios/Zingo/Images.xcassets/AppIcon-Beta.appiconset/*.png
#                   ios/Zingo/Images.xcassets/LaunchMark.imageset/*.png
#
# Those PNGs are BUILD OUTPUT and are not committed: the repository carries
# the vector, CI carries the raster. Run this before xcodebuild — the CI
# workflow does, and so must anyone opening the project in Xcode locally.
#
# Renderer: rsvg-convert (librsvg, GNOME, LGPL). No icon website, no
# uploads, nothing that sees the artwork but this machine. The PNGs are
# then flattened to remove the alpha channel iOS icons must not have.
#
# macOS only (it uses swift for the flatten pass).

set -euo pipefail

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$IOS_DIR/branding/swarm-appicon.svg"
ASSETS="$IOS_DIR/Zingo/Images.xcassets"
FLATTEN="$IOS_DIR/scripts/flatten-png.swift"

test -f "$SRC" || { echo "missing $SRC" >&2; exit 1; }

if ! command -v rsvg-convert >/dev/null 2>&1; then
    echo "rsvg-convert not found. Install it with:  brew install librsvg" >&2
    exit 1
fi

# Every pixel size referenced by the two appiconset Contents.json files.
ICON_SIZES="16 20 29 32 40 58 60 64 76 80 87 120 128 152 167 180 256 512 1024"

render() {  # render <size-px> <output-path>
    rsvg-convert --width "$1" --height "$1" --keep-aspect-ratio \
        --background-color '#0A0908' --format png \
        --output "$2" "$SRC"
}

generated=()

for set_name in AppIcon-Prod AppIcon-Beta; do
    out="$ASSETS/$set_name.appiconset"
    mkdir -p "$out"
    for size in $ICON_SIZES; do
        render "$size" "$out/Icon-$size.png"
        generated+=("$out/Icon-$size.png")
    done
    echo "rendered $(echo "$ICON_SIZES" | wc -w | tr -d ' ') icons into $set_name.appiconset"
done

# Launch-screen mark: 160 pt at 1x / 2x / 3x.
launch="$ASSETS/LaunchMark.imageset"
mkdir -p "$launch"
render 160 "$launch/LaunchMark.png"
render 320 "$launch/LaunchMark@2x.png"
render 480 "$launch/LaunchMark@3x.png"
generated+=("$launch/LaunchMark.png" "$launch/LaunchMark@2x.png" "$launch/LaunchMark@3x.png")
echo "rendered the launch mark at 1x / 2x / 3x"

echo "removing the alpha channel iOS icons must not carry"
swift "$FLATTEN" "${generated[@]}" > /dev/null
echo "done: ${#generated[@]} PNG files"
