"""Compose store screenshots for SWARM Wallet from real captures of the app.

The App Store and Google Play both accept only specific pixel sizes. This
script places real captures in iPhone frames for the App Store, or on a flat
canvas for Google Play. It uses the SWARM logo colours and the app's fonts,
then makes a contact sheet for review.

Every UI screen comes from a simulator, emulator, or phone capture named in
screens.json. The generated graphics sit behind the captured UI.

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
BRAND_DARK = (14, 17, 22)
BRAND_GOLD = (245, 166, 35)
BRAND_ORANGE = (232, 137, 12)

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


def brand_canvas(size: tuple[int, int], page: int) -> Image.Image:
    width, height = size
    base = Image.new("RGBA", size, (*BRAND_DARK, 255))
    glow = Image.new("RGBA", size)
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (round(width * 0.09), round(height * 0.29), round(width * 0.91), round(height * 0.95)),
        fill=(*BRAND_ORANGE, 72),
    )
    base = Image.alpha_composite(base, glow.filter(ImageFilter.GaussianBlur(round(width * 0.18))))

    graph = Image.new("RGBA", size)
    draw = ImageDraw.Draw(graph)
    for radius in (round(width * 0.49), round(width * 0.67), round(width * 0.85)):
        cx, cy = width // 2, round(height * 0.62)
        draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            outline=(*BRAND_GOLD, 31),
            width=max(2, width // 440),
        )
    shift = round(width * (0.018 if page % 2 else -0.018))
    left = [
        (round(width * 0.03) + shift, round(height * 0.32)),
        (round(width * 0.12) + shift, round(height * 0.43)),
        (round(width * 0.045) + shift, round(height * 0.55)),
        (round(width * 0.135) + shift, round(height * 0.69)),
        (round(width * 0.035) + shift, round(height * 0.84)),
    ]
    right = [
        (round(width * 0.96) + shift, round(height * 0.34)),
        (round(width * 0.865) + shift, round(height * 0.47)),
        (round(width * 0.96) + shift, round(height * 0.60)),
        (round(width * 0.87) + shift, round(height * 0.74)),
        (round(width * 0.96) + shift, round(height * 0.87)),
    ]
    for chain in (left, right):
        draw.line(chain, fill=(*BRAND_GOLD, 79), width=max(2, width // 330), joint="curve")
        for x, y in chain:
            radius = round(width * 0.007)
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*BRAND_GOLD, 170))
            draw.ellipse(
                (x - radius * 3, y - radius * 3, x + radius * 3, y + radius * 3),
                outline=(*BRAND_GOLD, 48),
                width=2,
            )
    return Image.alpha_composite(base, graph)


def iphone(capture_path: str, screen_width: int) -> Image.Image:
    capture = Image.open(capture_path).convert("RGB")
    screen_height = round(screen_width * capture.height / capture.width)
    rim = round(screen_width * 0.032)
    shell_width = screen_width + rim * 2
    shell_height = screen_height + rim * 2
    pad = round(screen_width * 0.035)
    phone = Image.new("RGBA", (shell_width + pad * 2, shell_height + pad * 2))
    draw = ImageDraw.Draw(phone)
    x, y = pad, pad

    button_width = max(4, rim // 3)
    draw.rounded_rectangle(
        (x - button_width, y + round(shell_height * 0.20), x + 2, y + round(shell_height * 0.30)),
        radius=button_width // 2,
        fill=(121, 102, 78, 255),
    )
    draw.rounded_rectangle(
        (x - button_width, y + round(shell_height * 0.34), x + 2, y + round(shell_height * 0.45)),
        radius=button_width // 2,
        fill=(121, 102, 78, 255),
    )
    draw.rounded_rectangle(
        (x + shell_width - 2, y + round(shell_height * 0.24), x + shell_width + button_width, y + round(shell_height * 0.39)),
        radius=button_width // 2,
        fill=(121, 102, 78, 255),
    )

    shell = Image.new("RGBA", (shell_width, shell_height))
    metal = Image.new("RGBA", (shell_width, shell_height))
    metal_draw = ImageDraw.Draw(metal)
    for column in range(shell_width):
        t = column / max(1, shell_width - 1)
        light = 0.5 + 0.5 * abs(2 * t - 1)
        color = (
            round(53 + 49 * light),
            round(48 + 38 * light),
            round(43 + 26 * light),
            255,
        )
        metal_draw.line((column, 0, column, shell_height), fill=color)
    shell_mask = Image.new("L", (shell_width, shell_height))
    ImageDraw.Draw(shell_mask).rounded_rectangle(
        (0, 0, shell_width - 1, shell_height - 1),
        radius=round(shell_width * 0.125),
        fill=255,
    )
    shell.paste(metal, (0, 0), shell_mask)
    shell_draw = ImageDraw.Draw(shell)
    shell_draw.rounded_rectangle(
        (2, 2, shell_width - 3, shell_height - 3),
        radius=round(shell_width * 0.125),
        outline=(219, 172, 101, 180),
        width=max(2, rim // 5),
    )
    shell_draw.rounded_rectangle(
        (rim // 2, rim // 2, shell_width - rim // 2 - 1, shell_height - rim // 2 - 1),
        radius=round(shell_width * 0.113),
        fill=(5, 6, 8, 255),
    )

    screen = capture.resize((screen_width, screen_height), Image.Resampling.LANCZOS).convert("RGBA")
    screen_mask = Image.new("L", screen.size)
    ImageDraw.Draw(screen_mask).rounded_rectangle(
        (0, 0, screen_width - 1, screen_height - 1),
        radius=round(screen_width * 0.10),
        fill=255,
    )
    screen.putalpha(screen_mask)
    shell.alpha_composite(screen, (rim, rim))
    shell_draw = ImageDraw.Draw(shell)
    shell_draw.rounded_rectangle(
        (rim - 2, rim - 2, shell_width - rim + 1, shell_height - rim + 1),
        radius=round(screen_width * 0.10),
        outline=(180, 159, 128, 135),
        width=2,
    )
    phone.alpha_composite(shell, (x, y))
    return phone


def compose_iphone(capture_path: str, entry: dict, size: tuple[int, int], page: int, count: int) -> Image.Image:
    width, height = size
    margin = round(width * 0.075)
    canvas = brand_canvas(size, page)
    draw = ImageDraw.Draw(canvas)
    mark_path = os.path.join(REPO, "design", "app-store", "logo", "swarm-mark-512.png")
    mark = Image.open(mark_path).convert("RGBA")
    mark.thumbnail((round(width * 0.06), round(width * 0.06)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (margin, round(height * 0.035)))
    draw.text(
        (margin + round(width * 0.077), round(height * 0.042)),
        "SWARM WALLET",
        font=ImageFont.truetype(FONT_EYEBROW, round(width * 0.028)),
        fill=CREAM,
    )
    counter = f"{page:02d} / {count:02d}"
    counter_font = ImageFont.truetype(FONT_EYEBROW, round(width * 0.025))
    draw.text(
        (width - margin - draw.textlength(counter, font=counter_font), round(height * 0.043)),
        counter,
        font=counter_font,
        fill=BRAND_GOLD,
    )
    rule_y = round(height * 0.081)
    draw.line((margin, rule_y, width - margin, rule_y), fill=(*BRAND_GOLD, 125), width=2)
    draw.text(
        (margin, round(height * 0.103)),
        entry.get("eyebrow", "SWARM WALLET").upper(),
        font=ImageFont.truetype(FONT_EYEBROW, round(width * 0.029)),
        fill=BRAND_GOLD,
    )
    title_font = ImageFont.truetype(FONT_TITLE, round(width * 0.064))
    title_y = round(height * 0.137)
    for line in wrap(draw, entry["caption"], title_font, width - margin * 2):
        draw.text((margin, title_y), line, font=title_font, fill=CREAM)
        title_y += round(width * 0.077)
    sub_font = ImageFont.truetype(FONT_SUB, round(width * 0.034))
    sub_y = title_y + round(width * 0.016)
    for line in wrap(draw, entry.get("sub", ""), sub_font, width - margin * 2):
        draw.text((margin, sub_y), line, font=sub_font, fill=MUTED)
        sub_y += round(width * 0.049)

    device = iphone(capture_path, round(width * 0.686))
    tilt = (-3.2, 3.2, -2.4, 2.4)[(page - 1) % 4]
    device = device.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    x = (width - device.width) // 2
    y = height - device.height - round(height * 0.027)
    shadow = Image.new("RGBA", device.size, (0, 0, 0, 0))
    shadow.putalpha(device.getchannel("A").filter(ImageFilter.GaussianBlur(round(width * 0.045))).point(lambda alpha: round(alpha * 0.55)))
    canvas.alpha_composite(shadow, (x + round(width * 0.018), y + round(width * 0.025)))
    canvas.alpha_composite(device, (x, y))
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
    parser.add_argument("--style", choices=("auto", "card", "iphone"), default="auto")
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
        style = args.style if args.style != "auto" else "iphone" if PRESETS[args.preset]["store"] == "ios" else "card"
        image = (
            compose_iphone(capture, entry, size, index, len(manifest))
            if style == "iphone"
            else compose(capture, entry["caption"], entry.get("sub", ""), size, entry.get("eyebrow", "SWARM WALLET"))
        )
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
