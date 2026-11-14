"""Generate outline-preserving Tegaki bundles from this app's existing fonts.

Run with Python + fontTools and Bun. --vendor is an installed Tegaki source
checkout, --artifacts is the verified i2 generated task directory.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser()
parser.add_argument("--vendor", required=True, type=Path)
parser.add_argument("--artifacts", required=True, type=Path)
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
assets = app / "public/assets/handwriting"
target = app / "src/app/closing/fonts"
args.artifacts.mkdir(parents=True, exist_ok=True)
vendor = args.vendor.resolve()
bun = shutil.which("bun")
assert bun and (vendor / "packages/generator").is_dir(), "Installed Tegaki source and Bun required"
cmap = TTFont(assets / "NapoleonHillPrint.ttf").getBestCmap()
chars = "".join(chr(c) for c in sorted(cmap) if c != 32)
cases = {
    "print": ["--font-file", str(assets / "NapoleonHillPrint.ttf"), "-c", " " + chars],
    "signature": ["--font-file", str(assets / "NapoleonHillSignature.ttf"), "-c", "\ue000",
                  "--reference-file", str(assets / "napoleon-hill-signature.strokes.json")],
}
report = {"tegakiVersion": "1.1.0", "upstreamCommit": subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=vendor, text=True).strip(), "cases": {}}
for name, flags in cases.items():
    out = args.artifacts.resolve() / "bundles" / name
    command = [bun, "start", "generate", *flags, "-o", str(out)]
    result = subprocess.run(command, cwd=vendor, capture_output=True, text=True, encoding="utf-8")
    (args.artifacts / f"generate-{name}.log").write_text(result.stdout + result.stderr, encoding="utf-8")
    assert result.returncode == 0, f"Generation failed: generate-{name}.log"
    data = json.loads((out / "glyphData.json").read_text(encoding="utf-8"))
    assert set(data) - {" "} == (set(chars) if name == "print" else {"\ue000"})
    if name == "signature":
        reference = json.loads((assets / "napoleon-hill-signature.strokes.json").read_text(encoding="utf-8"))["glyphs"]["\ue000"]
        # --font-file preserves the authentic TTF face and generates bundle.ts,
        # while --stroke-font generates the exact chronological 4-stroke data.
        stroke_out = args.artifacts.resolve() / "bundles/signature-reference"
        exact = subprocess.run([bun, "start", "generate", "--stroke-font",
            str(assets / "napoleon-hill-signature.strokes.json"), "-o", str(stroke_out)],
            cwd=vendor, capture_output=True, text=True, encoding="utf-8")
        (args.artifacts / "generate-signature-reference.log").write_text(exact.stdout + exact.stderr, encoding="utf-8")
        assert exact.returncode == 0
        data = json.loads((stroke_out / "glyphData.json").read_text(encoding="utf-8"))
        strokes = data["\ue000"]["s"]
        ref_point_count = sum(len(r) for r in reference)
        assert len(strokes) == len(reference)
        assert sum(len(s["p"]) for s in strokes) == ref_point_count
        assert all([p[:2] for p in stroke["p"]] == ref for stroke, ref in zip(strokes, reference)), "Reference coordinates/order changed"
        original = TTFont(assets / "NapoleonHillSignature.ttf")
        data["\ue000"]["w"] = original["hmtx"][original.getBestCmap()[0xE000]][0]
    dest = target / name
    dest.mkdir(parents=True, exist_ok=True)
    bundle = (out / "bundle.ts").read_text(encoding="utf-8")
    # Vite uses ?url imports. This is the only adaptation to generated output.
    bundle = re.sub(r"from '(\./[^']+\.ttf)' with \{ type: 'url' \}", r"from '\1?url'", bundle)
    bundle = bundle.replace(" with { type: 'json' }", "")
    (dest / "bundle.ts").write_text(bundle, encoding="utf-8")
    (dest / "glyphData.json").write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
    fonts = re.findall(r"'\./([^']+\.ttf)\?url'", bundle)
    for font in fonts:
        shutil.copy2(out / font, dest / font)
        generated = TTFont(dest / font)
        original = TTFont(assets / ("NapoleonHillPrint.ttf" if name == "print" else "NapoleonHillSignature.ttf"))
        assert set(generated.getBestCmap()) >= ({0xE000} if name == "signature" else set(cmap))
        for code, glyph_name in generated.getBestCmap().items():
            old = original["glyf"][original.getBestCmap()[code]].getCoordinates(original["glyf"])
            new = generated["glyf"][glyph_name].getCoordinates(generated["glyf"])
            assert old == new, f"Original outline changed: U+{code:04X}"
    report["cases"][name] = {"glyphs": len(data), "strokes": sum(len(g["s"]) for g in data.values()),
        "sourceSha256": hashlib.sha256((assets / ("NapoleonHillPrint.ttf" if name == "print" else "NapoleonHillSignature.ttf")).read_bytes()).hexdigest(),
        "bundleFonts": fonts, "originalOutlineCoordinatesExact": True,
        **({"referencePointsExact": sum(len(s["p"]) for s in data["\ue000"]["s"]), "referenceStrokeOrderExact": True, "advance": data["\ue000"]["w"]} if name == "signature" else {})}
(args.artifacts / "bundle-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
