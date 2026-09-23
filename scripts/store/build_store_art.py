"""Compose store screenshots for SWARM Wallet from real captures of the app.

The App Store and Google Play both accept only specific pixel sizes, and both
insist that a screenshot shows the app itself. A simulator or emulator capture
IS the app itself; it is simply the wrong size. This script puts each capture
on the SWARM canvas — warm black #0A0908, Sora/Manrope typefaces, a caption in
the voice of the listing — and produces exactly the sizes the two stores ask
for, then a contact sheet so a human can review the whole set in one look.

Nothing here invents a screen: every pixel of UI comes from a capture taken by
CI (or by the owner's phone) and named in screens.json. The captions are the
only drawn content, and they make the same claims as the store listings.

    python scripts/store/build_store_art.py --list-captures --raw DIR
    python scripts/store/build_store_art.py --preset ios69 --raw DIR --out DIR
    python scripts/store/build_store_art.py --preset play  --raw DIR --out DIR
    python scripts/store/build_store_art.py --contact-sheet OUT.png SHOT.png ...

Requirements: Pillow. The fonts are the ones the app ships (assets/fonts).
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

# The design system, as the launcher icon, the launch screen and the letterbox
# script already use it. Never invent a colour here.
BG = (10, 9, 8)          # #0A0908 warm black
BG_GLOW = (46, 29, 13)   # the honey halo behind the phone
CREAM = (247, 244, 239)  # #F7F4EF
HONEY = (255, 176, 32)   # #FFB020
MUTED = (168, 162, 154)  # #A8A29A

FONT_TITLE = os.path.join(REPO, "assets", "fonts", "Sora-Bold.ttf")
FONT_SUB = os.path.join(REPO, "assets", "fonts", "Manrope-Medium.ttf")
FONT_EYEBROW = os.path.join(REPO, "assets", "fonts", "Manrope-SemiBold.ttf")

# Every size a store accepts, and nothing else. Sources:
#   Apple  — "Screenshot specifications", App Store Connect help
#   Google — Play Console help, "Add preview assets to showcase your app"
PRESETS = {
    # Apple, iPhone 6.9-inch (iPhone 16 Pro Max class) — the required class.
    "ios69": {"size": (1320, 2868), "store": "ios"},
    # Apple, iPhone 6.5-inch (iPhone 11 Pro Max class) — optional second class.
    "ios65": {"size": (1242, 2688), "store": "ios"},
    # Google Play, phone. 1080x1920 is 9:16, Play's recommended ratio.
    "play": {"size": (1080, 1920), "store": "play"},
    # Google Play, phone, larger: what a 1440-wide capture becomes.
    "play_hd": {"size": (1440, 2560), "store": "play"},
}


def load_manifest(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must hold a list of screen entries")
    return data


def find_capture(raw_dir: str, entry: dict) -> str | None:
    """Accept the file the manifest names, or a same-stem file in any format."""
    named = os.path.join(raw_dir, entry["file"])
    if os.path.exists(named):
        return named
    stem = os.path.splitext(entry["file"])[0]
    if os.path.isdir(raw_dir):
        for name in sorted(os.listdir(raw_dir)):
            if os.path.splitext(name)[0] == stem:
                return os.path.join(raw_dir, name)
    return None


def fit(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Scale to sit inside box without cropping and without distorting."""
    width, height = image.size
    scale = min(box[0] / width, box[1] / height)
    return image.resize(
        (max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS
    )


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, image.size[0] - 1, image.size[1] - 1), radius=radius, fill=255
    )
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def warm_canvas(size: tuple[int, int], centre: tuple[int, int], strength: int = 132) -> Image.Image:
    """Warm black, with a soft honey halo behind the phone.

    Pillow's own 256x256 radial gradient, resized and offset, used as the mask
    that blends BG_GLOW over BG. No numpy, no asset files, deterministic.

    The transform's fill colour matters: Pillow fills what the shifted gradient
    no longer covers with 0, and a mask of 0 is full glow — that is how the
    first version of this drew a bright band across the bottom of the canvas.
    fill=255 means "outside the halo, no glow".
    """
    width, height = size
    base = Image.new("RGB", size, BG)
    gradient = Image.radial_gradient("L").resize(size, Image.BICUBIC)
    offset_x = width // 2 - centre[0]
    offset_y = height // 2 - centre[1]
    gradient = gradient.transform(
        size, Image.AFFINE, (1, 0, -offset_x, 0, 1, -offset_y), resample=Image.BICUBIC, fillcolor=255
    )
    mask = gradient.point(lambda value: max(0, strength - value))
    return Image.composite(Image.new("RGB", size, BG_GLOW), base, mask)


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def compose(
    capture_path: str,
    caption: str,
    sub: str,
    size: tuple[int, int],
    eyebrow: str = "SWARM WALLET",
) -> Image.Image:
    """One real capture, on the SWARM canvas, at exactly the size a store wants."""
    width, height = size
    margin = round(width * 0.075)
    canvas = warm_canvas(size, (width // 2, round(height * 0.63)))

    title_font = ImageFont.truetype(FONT_TITLE, round(width * 0.062))
    sub_font = ImageFont.truetype(FONT_SUB, round(width * 0.036))
    eyebrow_font = ImageFont.truetype(FONT_EYEBROW, round(width * 0.026))

    draw = ImageDraw.Draw(canvas)
    y = round(height * 0.052)

    if eyebrow:
        draw.text((margin, y), " ".join(eyebrow.upper()), font=eyebrow_font, fill=HONEY)
        y += round(width * 0.055)

    for line in wrap(draw, caption, title_font, width - margin * 2):
        draw.text((margin, y), line, font=title_font, fill=CREAM)
        y += round(width * 0.075)
    if sub:
        y += round(width * 0.012)
        for line in wrap(draw, sub, sub_font, width - margin * 2):
            draw.text((margin, y), line, font=sub_font, fill=MUTED)
            y += round(width * 0.05)
    y += round(height * 0.022)

    # The capture, rounded, with a honey hairline and a soft shadow. It is
    # scaled into the space that is left, so a two-line caption only ever makes
    # the phone smaller — never clipped, never cropped.
    capture = fit(Image.open(capture_path).convert("RGB"), (width - margin * 2, height - y - margin))
    radius = round(capture.size[0] * 0.055)
    card = rounded(capture, radius)
    ImageDraw.Draw(card).rounded_rectangle(
        (0, 0, card.size[0] - 1, card.size[1] - 1),
        radius=radius,
        outline=(*HONEY, 255),
        width=max(2, width // 400),
    )

    x = (width - card.size[0]) // 2
    offset = max(8, width // 110)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (x + offset, y + offset, x + card.size[0] + offset, y + card.size[1] + offset),
        radius=radius,
        fill=(0, 0, 0, 150),
    )
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(width // 80)))
    canvas.alpha_composite(card, (x, y))
    return canvas.convert("RGB")


def contact_sheet(paths: list[str], out: str, columns: int = 5) -> str:
    """Every composed shot in one image, so the whole set can be judged at once."""
    thumbs = [(os.path.basename(path), fit(Image.open(path).convert("RGB"), (360, 780))) for path in paths]
    cell_w = max(thumb.size[0] for _name, thumb in thumbs) + 24
    cell_h = max(thumb.size[1] for _name, thumb in thumbs) + 56
    rows = (len(thumbs) + columns - 1) // columns
    sheet = Image.new("RGB", (cell_w * min(columns, len(thumbs)), cell_h * rows), BG)
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(FONT_SUB, 20)
    for index, (name, thumb) in enumerate(thumbs):
        cx = (index % columns) * cell_w
        cy = (index // columns) * cell_h
        sheet.paste(thumb, (cx + (cell_w - thumb.size[0]) // 2, cy + 12))
        draw.text((cx + 12, cy + cell_h - 38), name[:44], font=label_font, fill=CREAM)
    sheet.save(out, optimize=True)
    return out

def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--preset", choices=sorted(PRESETS), help="which store size class to build")
    parser.add_argument("--raw", help="directory of real captures from the app")
    parser.add_argument("--out", help="directory to write into")
    parser.add_argument("--manifest", default=os.path.join(HERE, "screens.json"))
    parser.add_argument("--list-captures", action="store_true", help="show what the capture set is and what is missing")
    parser.add_argument("--contact-sheet", metavar="OUT", help="compose a review sheet from the PNGs given as inputs")
    parser.add_argument("pngs", nargs="*", help="PNG files, for --contact-sheet")
    args = parser.parse_args(argv[1:])

    if args.contact_sheet:
        if not args.pngs:
            parser.error("--contact-sheet needs the PNG files to show")
        print(contact_sheet(args.pngs, args.contact_sheet))
        return 0

    if not args.raw:
        parser.error("--raw is required (the directory holding the real captures)")
    manifest = load_manifest(args.manifest)

    if args.list_captures:
        missing = 0
        for entry in manifest:
            found = find_capture(args.raw, entry)
            if not found:
                missing += 1
            print(f"{entry['file']:28} {found or 'MISSING'}")
        print(f"{len(manifest)} screens defined, {missing} missing from {args.raw}")
        return 0 if missing == 0 else 1

    if not args.preset:
        parser.error("--preset is required unless --list-captures is given")

    size = PRESETS[args.preset]["size"]
    out_dir = args.out or os.path.join(REPO, "store", args.preset)
    os.makedirs(out_dir, exist_ok=True)
    written, skipped = [], []
    for index, entry in enumerate(manifest, start=1):
        capture = find_capture(args.raw, entry)
        if not capture:
            skipped.append(entry["file"])
            continue
        image = compose(capture, entry["caption"], entry.get("sub", ""), size, entry.get("eyebrow", "SWARM WALLET"))
        # The stores keep the order the file names give them.
        path = os.path.join(out_dir, f"{index:02d}-{entry['slug']}-{args.preset}.png")
        image.save(path, optimize=True)
        written.append(path)
        print(f"{os.path.basename(capture):34} -> {path}  {image.size[0]}x{image.size[1]}")

    if skipped:
        print(f"skipped, no capture present: {', '.join(skipped)}", file=sys.stderr)
    if not written:
        print("nothing written: no capture in --raw matched the manifest", file=sys.stderr)
        return 1
    if len(written) >= 2:
        print(contact_sheet(written, os.path.join(out_dir, "contact-sheet.png")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
