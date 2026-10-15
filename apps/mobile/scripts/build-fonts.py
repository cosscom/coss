"""Cuts the app's static TTFs from @coss/ui's WOFF2 fonts (iOS loads neither WOFF2 nor, reliably,
variable weights). Run after the fonts in packages/ui/src/fonts change:

    python3 -m venv /tmp/fonts && /tmp/fonts/bin/pip install fonttools brotli
    /tmp/fonts/bin/python apps/mobile/scripts/build-fonts.py
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "packages/ui/src/fonts"
OUT = ROOT / "apps/mobile/assets/fonts"

# name -> axis location. opsz 14 is the text drawing, 32 the display one; GEOM 25 is the UI default
# and 50 the wordmark's (coss.com sets 'GEOM' 50, 'opsz' 32 on it).
CAL_SANS = {
    "Regular": {"wght": 400, "opsz": 14},
    "Medium": {"wght": 500, "opsz": 14},
    "SemiBold": {"wght": 600, "opsz": 14},
    "Display": {"wght": 600, "opsz": 32},
    "Wordmark": {"wght": 700, "opsz": 32, "GEOM": 50},
}


def rename(font: TTFont, family: str, style: str) -> None:
    postscript = f"{family.replace(' ', '')}-{style}"
    name = font["name"]
    for record in list(name.names):
        if record.nameID in (1, 2, 3, 4, 6, 16, 17, 25):
            name.removeNames(nameID=record.nameID)
    for name_id, value in {
        1: f"{family} {style}",
        2: "Regular",
        3: postscript,
        4: f"{family} {style}",
        6: postscript,
    }.items():
        name.setName(value, name_id, 3, 1, 0x409)
        name.setName(value, name_id, 1, 0, 0)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for style, location in CAL_SANS.items():
        font = TTFont(SOURCE / "CalSansVF.woff2")
        axes = {"GEOM": 25, "YTAS": 1440, "SHRP": 0, **location}
        static = instancer.instantiateVariableFont(font, axes)
        static.flavor = None
        rename(static, "Cal Sans", style)
        static.save(OUT / f"CalSans-{style}.ttf")
    mono = TTFont(SOURCE / "PaperMono-Regular.woff2")
    mono.flavor = None
    mono.save(OUT / "PaperMono-Regular.ttf")


if __name__ == "__main__":
    main()
