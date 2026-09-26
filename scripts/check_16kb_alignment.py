#!/usr/bin/env python3
"""Fails if a 64-bit native library is not 16 KB page aligned.

Android 15 runs 64-bit devices with a 16 KB page size, and Google Play
refuses an app whose 64-bit ELF segments are laid out for 4 KB pages. The
loader has no fallback: the library simply does not map. Nothing in the
build says so, which is why this reads the shipped artifact.

Usage: check_16kb_alignment.py <apk|aab|directory> [...]
"""

import struct
import sys
import zipfile
from pathlib import Path

PAGE = 16384
ABIS_64 = ("arm64-v8a", "x86_64")
PT_LOAD = 1


def load_aligns(blob):
    """Returns the p_align of every PT_LOAD segment in an ELF image."""
    if blob[:4] != b"\x7fELF":
        raise ValueError("not an ELF image")
    bits, endian = blob[4], blob[5]
    order = "<" if endian == 1 else ">"
    if bits == 2:
        phoff, phentsize, phnum = (
            struct.unpack_from(order + "Q", blob, 0x20)[0],
            struct.unpack_from(order + "H", blob, 0x36)[0],
            struct.unpack_from(order + "H", blob, 0x38)[0],
        )
        align_at = 0x30
        unpack = order + "Q"
    else:
        phoff, phentsize, phnum = (
            struct.unpack_from(order + "I", blob, 0x1C)[0],
            struct.unpack_from(order + "H", blob, 0x2A)[0],
            struct.unpack_from(order + "H", blob, 0x2C)[0],
        )
        align_at = 0x1C
        unpack = order + "I"
    aligns = []
    for i in range(phnum):
        base = phoff + i * phentsize
        if struct.unpack_from(order + "I", blob, base)[0] != PT_LOAD:
            continue
        aligns.append(struct.unpack_from(unpack, blob, base + align_at)[0])
    return aligns


def abi_of(path):
    """Returns the ABI directory name an .so sits under, or None."""
    for part in reversed(Path(path).parts[:-1]):
        if part in ("arm64-v8a", "x86_64", "armeabi-v7a", "x86"):
            return part
    return None


def libs_in_zip(path):
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if not name.endswith(".so"):
                continue
            if not (name.startswith("lib/") or name.startswith("base/lib/")):
                continue
            yield name, z.read(name)


def libs_in_dir(path):
    for p in sorted(Path(path).rglob("*.so")):
        yield str(p), p.read_bytes()


def check(target):
    path = Path(target)
    if path.is_dir():
        entries = libs_in_dir(path)
    else:
        entries = libs_in_zip(path)

    offenders, checked, reported = [], 0, 0
    for name, blob in entries:
        abi = abi_of(name)
        aligns = load_aligns(blob)
        worst = min(aligns) if aligns else 0
        if abi in ABIS_64:
            checked += 1
            mark = "ok" if worst >= PAGE else "FAIL"
            print(f"  {mark} {name} p_align {hex(worst)}")
            if worst < PAGE:
                offenders.append((name, worst))
        else:
            reported += 1
            print(f"  -- {name} p_align {hex(worst)} ({abi}, 32-bit, not gated)")
    return offenders, checked, reported


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    offenders, checked, reported = [], 0, 0
    for target in argv[1:]:
        print(f"16 KB alignment of {target}")
        o, c, r = check(target)
        offenders += o
        checked += c
        reported += r
    if offenders:
        print(
            f"\nFAIL: {len(offenders)} 64-bit library/libraries are not 16 KB aligned:",
            file=sys.stderr,
        )
        for name, worst in offenders:
            print(f"  {name} p_align {hex(worst)}", file=sys.stderr)
        print(
            "\nRebuild the native libraries with -Wl,-z,max-page-size=16384.",
            file=sys.stderr,
        )
        return 1
    print(f"\nok: {checked} 64-bit libraries are 16 KB aligned, {reported} 32-bit reported")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
