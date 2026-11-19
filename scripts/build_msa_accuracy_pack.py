"""Build a blind human review pack from the saved browser OCR cache. Outputs stay outside the repo."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
FROZEN = {name.casefold() for name in ["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"]}

# Source-free region definitions, inspected against the original page layout.
# Coordinates: visible page, top-left origin, x right, y down, normalized [0,1].
SAMPLES = [
    (27, "text", "Vocabulary choices", [(0.08, 0.10, 0.87, 0.173), (0.08, 0.547, 0.89, 0.358)]),
    (60, "text", "Reading comprehension and verse", [(0.08, 0.10, 0.87, 0.37), (0.08, 0.475, 0.87, 0.422)]),
    (84, "text", "Filipino grammar", [(0.08, 0.10, 0.89, 0.28), (0.08, 0.59, 0.89, 0.305)]),
    (101, "text", "Directions, labels, and MCQs", [(0.11, 0.125, 0.85, 0.213), (0.11, 0.34, 0.85, 0.165)]),
    (3, "math", "Decimals and number words", [(0.08, 0.09, 0.87, 0.375), (0.08, 0.72, 0.87, 0.175)]),
    (10, "math", "Mixed and stacked fractions", [(0.065, 0.10, 0.87, 0.42), (0.065, 0.53, 0.87, 0.36)]),
    (121, "math", "Worked arithmetic and fractions", [(0.08, 0.105, 0.87, 0.278), (0.08, 0.75, 0.87, 0.145)]),
    (135, "math", "Units, rates, and percentages", [(0.08, 0.105, 0.87, 0.27), (0.08, 0.38, 0.87, 0.515)]),
    (146, "keys", "Mathematics key columns", [(0.08, 0.12, 0.31, 0.33), (0.56, 0.12, 0.35, 0.33)]),
    (148, "keys", "Letter keys with corrected phrases", [(0.08, 0.095, 0.86, 0.285), (0.51, 0.64, 0.42, 0.24)]),
    (150, "keys", "Filipino keys and numbering resets", [(0.08, 0.12, 0.85, 0.143), (0.08, 0.56, 0.85, 0.175)]),
    (155, "keys", "Abstract reasoning letter-key columns", [(0.08, 0.48, 0.27, 0.385), (0.64, 0.48, 0.29, 0.385)]),
]


def outside_repo(path: Path) -> Path:
    resolved = path.resolve()
    try:
        inside = os.path.commonpath([os.path.normcase(ROOT), os.path.normcase(resolved)]) == os.path.normcase(ROOT)
    except ValueError:  # Different Windows drive: outside the repository.
        inside = False
    if inside:
        raise ValueError("Source-derived output must stay outside the repository, including ignored directories.")
    return resolved


def crop_bounds(rect, width, height):
    x, y, w, h = rect
    if not (x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 1 and y + h <= 1):
        raise ValueError("Invalid normalized source crop")
    left, top = round(x * width), round(y * height)
    right, bottom = round((x + w) * width), round((y + h) * height)
    return left, top, right, bottom


def region_tokens(words, rect):
    x, y, w, h = rect
    return [word for word in words if x <= word["box"]["x"] + word["box"]["width"] / 2 < x + w and y <= word["box"]["y"] + word["box"]["height"] / 2 < y + h]


def blank_labels(manifest):
    return {"schemaVersion": 1, "packId": manifest["packId"], "sourceSha256": manifest["sourceSha256"],
            "regions": [{"id": region["id"], "status": "unchecked", "transcription": "", "math": "", "digits": "", "keys": "", "noKeys": False, "notes": ""} for region in manifest["regions"]]}


STYLE = """body{font:16px/1.55 system-ui,sans-serif;color:#172133;background:#f3f6fa;margin:0}main{max-width:1080px;margin:auto;padding:28px}h1,h2,h3{line-height:1.2}a{color:#2546a8}header,.card{background:white;border:1px solid #d4deeb;border-radius:14px;padding:24px;margin:18px 0}nav{display:flex;flex-wrap:wrap;gap:14px}.badge{font-size:13px;padding:3px 9px;border-radius:20px;background:#eaf0ff}img{display:block;max-width:100%;height:auto;border:1px solid #ced6e0;background:white;margin:16px 0}textarea{box-sizing:border-box;width:100%;font:15px/1.5 ui-monospace,monospace;padding:12px;border:1px solid #9cacc2;border-radius:7px;min-height:100px}label{display:block;font-weight:600;margin:14px 0 6px}button,select{font:inherit;padding:9px 15px;border-radius:7px;border:1px solid #a4b4ca;background:#edf2ff;color:#182d6b;cursor:pointer}button.primary{background:#2649b6;color:white}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f3f7;padding:16px;font:14px/1.6 ui-monospace,monospace}small,.muted{color:#53647b}.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.warning{background:#fff6d8;border-left:4px solid #c08c16;padding:12px}input[type=checkbox]{width:18px;height:18px;vertical-align:middle}footer{padding:20px;color:#53647b}@media print{body{background:white}main{padding:0}.actions,nav{display:none}.card{break-inside:avoid}textarea{min-height:120px}}"""


def page(title, body, script=""):
    return f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><style>{STYLE}</style><main>{body}</main>{script}</html>'


def build(pdf, cache_path, out, dpi=200):
    pdf = pdf.resolve()
    if pdf.name.casefold() in FROZEN:
        raise ValueError("Frozen held-out PDF: refusing to open")
    out = outside_repo(out)
    if out.exists():
        raise ValueError("Use a new output directory; existing reviewer work is never overwritten.")
    zip_path = out.with_suffix(".zip")
    if zip_path.exists():
        raise ValueError("Archive already exists; refusing to overwrite")
    data = json.loads(cache_path.read_text(encoding="utf-8"))
    source_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if source_hash != data["source"]["sourceHash"]:
        raise ValueError("The source PDF does not match the saved browser OCR hash")
    pages = {item["pageNumber"]: item for item in data["pages"]}
    if set(pages) != set(range(1, 157)) or data["dpi"] != 144 or data["language"] != "eng":
        raise ValueError("Expected the complete English 144-DPI MSA browser run")
    renderer = shutil.which("pdftoppm")
    if not renderer:
        raise RuntimeError("pdftoppm is required for faithful original page renders")
    (out / "originals").mkdir(parents=True)
    (out / "ocr-output").mkdir()
    pack_id = "msa-review-" + source_hash[:12] + "-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    manifest = {"schemaVersion": 1, "packId": pack_id, "sourceSha256": source_hash, "sourceName": pdf.name,
                "engineVersion": data["engineVersion"], "ocrLanguage": "eng", "ocrDpi": 144, "referenceDpi": dpi,
                "coordinateSystem": "visible page, normalized 0..1, top-left origin, x right, y down", "regions": []}
    ocr_regions = []
    for number, category, feature, rectangles in SAMPLES:
        base = out / "originals" / f"page-{number:03}"
        subprocess.run([renderer, "-f", str(number), "-l", str(number), "-singlefile", "-cropbox", "-r", str(dpi), "-png", str(pdf), str(base)], check=True, capture_output=True)
        image = Image.open(base.with_suffix(".png")).convert("RGB")
        for index, rect in enumerate(rectangles, 1):
            region_id = f"{category}-{number:03}-{index}"
            bounds = crop_bounds(rect, image.width, image.height)
            cropped = image.crop(bounds)
            relative_image = f"originals/{region_id}.png"
            cropped.save(out / relative_image)
            left, top, right, bottom = bounds
            actual_rect = [left / image.width, top / image.height, (right - left) / image.width, (bottom - top) / image.height]
            manifest["regions"].append({"id": region_id, "page": number, "category": category, "feature": feature,
                "crop": actual_rect, "pixelBounds": list(bounds), "image": relative_image, "fullPage": f"originals/page-{number:03}.png",
                "imageSha256": hashlib.sha256((out / relative_image).read_bytes()).hexdigest()})
            tokens = region_tokens(pages[number]["words"], actual_rect)
            ocr_regions.append({"id": region_id, "page": number, "tokens": tokens})
        (out / "ocr-output" / f"page-{number:03}.txt").write_text(pages[number]["text"], encoding="utf-8")
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "labels-template.json").write_text(json.dumps(blank_labels(manifest), indent=2), encoding="utf-8")
    (out / "ocr-output" / "region-tokens.json").write_text(json.dumps(ocr_regions, indent=2, ensure_ascii=False), encoding="utf-8")

    guide = """<p>Transcribe the original crops before opening the separate OCR reference. All fields start blank. PDF page numbers below are one-based file page numbers; printed page numbers can differ.</p><p>Copy visible wording, punctuation, option labels, and actual printed digits. Empty answer bubbles and scanner bars are not letters or zeros. Mark unreadable spans <code>[illegible]</code> and explain them in Notes; never infer an answer from the question.</p><p>For math, record each expression separately: use <code>a/b</code> for stacked fractions, <code>x^2</code> for superscripts, and <code>sqrt(...)</code> for roots. Preserve signs, decimals, percentages, units, and parentheses. In key tables, read each column top-to-bottom, moving left-to-right; record keys as <code>section | printed question number | printed letter/value</code>, including the section when numbering restarts. Copy only explicit printed or circled keys.</p><p>Reference crops are rendered at 200 DPI with no enhancement. Rendering larger cannot restore detail missing from the scan. Source PDF stays in its original folder. Export your labels regularly; browser autosave is a convenience, and file-page storage depends on the browser.</p>"""
    human = f'<header><span class="badge">ORIGINALS ONLY - HUMAN LABELS</span><h1>MSA accuracy review</h1>{guide}<nav><a href="index.html">Pack overview</a><a href="ocr.html" target="_blank" rel="noopener">Separate OCR reference - open after transcribing</a></nav><div class="actions"><button class="primary" id="export">Export my labels</button><label>Restore exported labels <input id="import" type="file" accept="application/json"></label><a href="labels-template.json" download>Blank JSON template</a></div><p id="save-status" role="status">No checked labels yet.</p></header>'
    for region in manifest["regions"]:
        rid = region["id"]
        human += f'<section class="card" id="{rid}" data-region="{rid}"><span class="badge">{region["category"].upper()}</span><h2>{rid}: PDF page {region["page"]}</h2><p>{html.escape(region["feature"])}. <a href="{region["fullPage"]}" target="_blank">Open complete original page</a></p><img src="{region["image"]}" alt="Original crop {rid}" loading="lazy">'
        for field, label, rows in [("transcription", "Visible text - transcribe exactly", 5), ("math", "Math expressions - one per line where present", 3), ("digits", "Every visible digit/number - in reading order", 2), ("keys", "Every explicit printed key - section | number | letter/value", 3), ("notes", "Unclear glyphs, scan damage, or layout notes", 2)]:
            human += f'<label for="{rid}-{field}">{label}</label><textarea id="{rid}-{field}" data-field="{field}" rows="{rows}" spellcheck="false" autocomplete="off"></textarea>'
        human += '<label><input type="checkbox" data-field="noKeys"> I checked: this crop contains no explicit key.</label><label>Review status <select data-field="status"><option value="unchecked">Unchecked</option><option value="checked">Checked against original</option><option value="illegible">Needs help / partly illegible</option></select></label></section>'
    # Only source metadata and blank label defaults enter this document. No OCR text or tokens.
    metadata = json.dumps(blank_labels(manifest)).replace("<", "\\u003c")
    script = '<script>const TEMPLATE=' + metadata + ';\n' + (SCRIPTS / "msaReviewForm.js").read_text(encoding="utf-8") + '</script>'
    (out / "review.html").write_text(page("MSA originals and blank labels", human, script), encoding="utf-8")
    machine = '<header><span class="badge">MACHINE OCR - REFERENCE ONLY</span><h1>Saved browser OCR</h1><p>This document contains machine output, not checked truth. Consult it after transcribing the originals. Output is the saved English Tesseract.js 7.0.0 run at 144 DPI; it was not rerun or corrected for this pack.</p><p>Region tokens retain their saved order and spelling. Crop membership uses the center of each word box. Full-page text is also provided because table columns and line segmentation can differ. Confidence is uncalibrated and does not establish correctness.</p><nav><a href="review.html">Return to originals and labels</a><a href="index.html">Overview</a></nav></header>'
    for region in manifest["regions"]:
        tokens = next(item["tokens"] for item in ocr_regions if item["id"] == region["id"])
        machine += f'<section class="card" id="{region["id"]}"><h2>{region["id"]}: PDF page {region["page"]}</h2><p>Selected-region tokens ({len(tokens)} words). No manual corrections.</p><pre>{html.escape(" ".join(word["text"] for word in tokens))}</pre><details><summary>Full-page OCR exactly as saved</summary><pre>{html.escape(pages[region["page"]]["text"])}</pre></details><p><a href="ocr-output/page-{region["page"]:03}.txt">Plain full-page OCR</a></p></section>'
    (out / "ocr.html").write_text(page("MSA separate OCR reference", machine), encoding="utf-8")
    overview = f'<header><h1>MSA accuracy review pack</h1><p>{len(SAMPLES)} source pages, {len(manifest["regions"])} review crops: text, math, and answer keys. English and Filipino content are included. Human labels remain blank; no accuracy score or grading permission is created.</p><div class="card"><h2>1. Transcribe originals first</h2><p>Original crops with blank text, math, digit, and key fields. Export a JSON file when finished or when pausing.</p><a href="review.html">Open originals and blank review form</a></div><div class="card"><h2>2. Compare separately</h2><p>Saved OCR tokens and full-page text, kept out of the human review document.</p><a href="ocr.html">Open the separate OCR reference</a></div><p>All files work locally with no network or AI calls. Extract the ZIP before opening its HTML files.</p><p>Source SHA-256: <code>{source_hash}</code></p><p>No checked labels were supplied. These samples are deliberately chosen by features and are not a random estimate of whole-book accuracy.</p></header>'
    (out / "index.html").write_text(page("MSA accuracy review pack", overview), encoding="utf-8")
    thumbs = Image.new("RGB", (1000, ((len(manifest["regions"]) + 3) // 4) * 210), "#edf2f8")
    draw = ImageDraw.Draw(thumbs)
    for index, region in enumerate(manifest["regions"]):
        image = Image.open(out / region["image"]).convert("RGB"); image.thumbnail((238, 175))
        x, y = index % 4 * 250 + 5, index // 4 * 210 + 25
        thumbs.paste(image, (x, y)); draw.text((x, y - 20), region["id"], fill="black")
    thumbs.save(out / "crop-contact-sheet.png")
    with ZipFile(zip_path, "w", ZIP_DEFLATED) as archive:
        for item in sorted(out.rglob("*")):
            if item.is_file(): archive.write(item, item.relative_to(out))
    print(f"Review pack: {out}")
    print(f"Archive: {zip_path}")
    print("| Category | Pages | Crops |")
    print("|---|---|---|")
    for category in ["text", "math", "keys"]:
        regions = [item for item in manifest["regions"] if item["category"] == category]
        print(f"| {category} | {len(set(item['page'] for item in regions))} | {len(regions)} |")
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "msa-accuracy-work/browser-ocr.json")
    parser.add_argument("--out", type=Path, default=Path(tempfile.gettempdir()) / ("msa-accuracy-review-" + datetime.now().strftime("%Y%m%d-%H%M%S")))
    args = parser.parse_args()
    cache = json.loads(args.cache.read_text(encoding="utf-8"))
    build(Path(cache["source"]["file"]), args.cache, args.out)
