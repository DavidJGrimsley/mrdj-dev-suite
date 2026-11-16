"""Generate src/styles/ellipsis-latin.ttf: a one-glyph font holding a baseline U+2026.

Rounded Mplus 1c draws its ellipsis on the midline (CJK style). widgets.css layers this face
over the family with `unicode-range: U+2026`, so the glyph has to look like three of that
font's own periods: same dot (94 x 138 units, pill shaped), same pitch and the same advance
as "..." (802 units), sitting on the baseline. Line metrics match the family (1075 / -320)
so the substituted glyph never changes a line's height.

Run with Python + fontTools:  python scripts/generate-ellipsis-font.py
"""
import math
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UNITS = 1000
ASCENT, DESCENT = 1075, -320
DOT_W, DOT_H = 94, 138
FIRST_DOT_X, PITCH, ADVANCE = 95, 259, 802


def arc(pen, cx, cy, r, start_deg, end_deg, steps=4):
    """Clockwise arc as quadratic segments (control point on the tangent intersection)."""
    span = (end_deg - start_deg) / steps
    for i in range(steps):
        a0 = math.radians(start_deg + span * i)
        a1 = math.radians(start_deg + span * (i + 1))
        mid = (a0 + a1) / 2
        k = r / math.cos((a1 - a0) / 2)
        pen.qCurveTo(
            (round(cx + k * math.cos(mid)), round(cy + k * math.sin(mid))),
            (round(cx + r * math.cos(a1)), round(cy + r * math.sin(a1))),
        )


def dot(pen, x):
    r = DOT_W / 2
    cx = x + r
    pen.moveTo((x, round(r)))
    pen.lineTo((x, round(DOT_H - r)))
    arc(pen, cx, DOT_H - r, r, 180, 0)       # over the top, left to right
    pen.lineTo((x + DOT_W, round(r)))
    arc(pen, cx, r, r, 0, -180)              # under the bottom, right to left
    pen.closePath()


ellipsis = TTGlyphPen(None)
for i in range(3):
    dot(ellipsis, FIRST_DOT_X + PITCH * i)

fb = FontBuilder(UNITS, isTTF=True)
fb.setupGlyphOrder([".notdef", "ellipsis"])
fb.setupCharacterMap({0x2026: "ellipsis"})
fb.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "ellipsis": ellipsis.glyph()})
fb.setupHorizontalMetrics({".notdef": (500, 0), "ellipsis": (ADVANCE, FIRST_DOT_X)})
fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT, lineGap=0)
fb.setupNameTable({
    "familyName": "i2 Latin Ellipsis", "styleName": "Regular",
    "uniqueFontIdentifier": "i2LatinEllipsis-Regular", "fullName": "i2 Latin Ellipsis Regular",
    "version": "Version 1.000", "psName": "i2LatinEllipsis-Regular",
})
fb.setupOS2(
    sTypoAscender=ASCENT, sTypoDescender=DESCENT, sTypoLineGap=0,
    usWinAscent=ASCENT, usWinDescent=-DESCENT, sxHeight=531, sCapHeight=730,
)
fb.setupPost()
out = Path(__file__).resolve().parents[1] / "src/styles/ellipsis-latin.ttf"
fb.save(out)
print(f"{out} ({out.stat().st_size} bytes)")
