/** Read-only image inventory. Run with CORPUS_ROOT set; writes only to ignored reports/. */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const corpusRoot = process.env.CORPUS_ROOT;
if (!corpusRoot) throw new Error("Set CORPUS_ROOT to the external corpus directory");

const python = String.raw`
import hashlib, json, os, re, statistics, sys
from collections import Counter, defaultdict
from PIL import Image, ImageOps
import numpy as np

root = sys.argv[1]
rows = []
thumbs = {}
for folder, _, files in os.walk(root):
    for name in files:
        if name.lower().endswith('.pdf'):
            continue
        full = os.path.join(folder, name)
        rel = os.path.relpath(full, root)
        try:
            with Image.open(full) as source:
                image = ImageOps.exif_transpose(source)
                kind = source.format or 'UNKNOWN'
                exif = source.getexif()
                camera_make = str(exif.get(271, '')).strip()
                camera_model = str(exif.get(272, '')).strip()
                width, height = image.size
                gray = ImageOps.grayscale(image)
                gray.thumbnail((256, 256))
                pixels = np.asarray(gray, dtype=np.uint8)
                luma = round(float(pixels.mean()), 1)
                dark_pct = round(float((pixels < 64).mean() * 100), 1)
                tiny = np.asarray(ImageOps.grayscale(image).resize((9, 8)), dtype=np.uint8)
                dhash = ''.join('1' if a > b else '0' for a, b in zip(tiny[:, :-1].flat, tiny[:, 1:].flat))
                if width >= 400 and height >= 600:
                    thumbs[rel] = ImageOps.grayscale(image).resize((96, max(96, round(height * 96 / width))))
            with open(full, 'rb') as handle:
                digest = hashlib.file_digest(handle, 'sha256').hexdigest()
            rows.append(dict(folder=os.path.relpath(folder, root), file=name, path=rel,
                format=kind, extension=os.path.splitext(name)[1].lower(), bytes=os.path.getsize(full),
                width=width, height=height, aspect=round(height / width, 2), meanLuminance=luma,
                darkPixelPct=dark_pct, darkMode=luma < 110, sha256=digest, dhash=dhash,
                exifPresent=bool(exif), cameraMake=camera_make, cameraModel=camera_model))
        except Exception as error:
            rows.append(dict(folder=os.path.relpath(folder, root), file=name, path=rel,
                format='UNREADABLE', error=str(error)))

def natural_key(value):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', value)]

def overlap_score(first, second):
    if first.width != second.width:
        return None
    a = np.asarray(first, dtype=np.float32)
    b = np.asarray(second, dtype=np.float32)
    best = 0.0
    best_fraction = 0.0
    for fraction in (0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75):
        h = round(min(a.shape[0], b.shape[0]) * fraction)
        if h < 24:
            continue
        ac = np.asarray(Image.fromarray(a[-h:].astype('uint8')).resize((96, 96)), dtype=np.float32)
        bc = np.asarray(Image.fromarray(b[:h].astype('uint8')).resize((96, 96)), dtype=np.float32)
        if ac.std() < 5 or bc.std() < 5:
            continue
        corr = float(np.corrcoef(ac.flat, bc.flat)[0, 1])
        if np.isfinite(corr) and corr > best:
            best, best_fraction = corr, fraction
    return dict(score=round(best, 3), overlapFraction=best_fraction)

by_folder = defaultdict(list)
for row in rows:
    if row['format'] != 'UNREADABLE':
        by_folder[row['folder']].append(row)
overlaps = []
for folder, group in by_folder.items():
    ordered = sorted(group, key=lambda row: natural_key(row['file']))
    for first, second in zip(ordered, ordered[1:]):
        if first['path'] not in thumbs or second['path'] not in thumbs:
            continue
        result = overlap_score(thumbs[first['path']], thumbs[second['path']])
        if result and result['score'] >= 0.8:
            overlaps.append(dict(folder=folder, first=first['file'], second=second['file'], **result))

hash_groups = defaultdict(list)
for row in rows:
    if row['format'] != 'UNREADABLE':
        hash_groups[row['sha256']].append(row['path'])
exact_duplicates = [paths for paths in hash_groups.values() if len(paths) > 1]

near_duplicates = []
valid = [row for row in rows if row['format'] != 'UNREADABLE']
for i, first in enumerate(valid):
    for second in valid[i + 1:]:
        if first['sha256'] == second['sha256']:
            continue
        if first['folder'] != second['folder']:
            continue
        distance = sum(a != b for a, b in zip(first['dhash'], second['dhash']))
        if distance <= 5:
            near_duplicates.append(dict(first=first['path'], second=second['path'], distance=distance))

print(json.dumps(dict(rows=rows, exactDuplicates=exact_duplicates,
    nearDuplicateCandidates=near_duplicates, overlapCandidates=overlaps)))
`;

const result = spawnSync("python", ["-c", python, corpusRoot], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
if (result.status !== 0) throw new Error(result.stderr || `Python exited ${result.status}`);
const inventory = JSON.parse(result.stdout) as {
  rows: Array<Record<string, any>>;
  exactDuplicates: string[][];
  nearDuplicateCandidates: Array<Record<string, any>>;
  overlapCandidates: Array<Record<string, any>>;
};

const outDir = path.resolve("reports");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "image_inventory.json"), JSON.stringify(inventory, null, 2));

const valid = inventory.rows.filter((row) => row.format !== "UNREADABLE");
console.log("| Measure | Count |");
console.log("|---|---:|");
for (const [label, value] of [
  ["Non-PDF files", inventory.rows.length],
  ["Readable images", valid.length],
  ["Unreadable files", inventory.rows.length - valid.length],
  ["Dark-mode candidates", valid.filter((row) => row.darkMode).length],
  ["Exact duplicate groups", inventory.exactDuplicates.length],
  ["Near-duplicate candidate pairs", inventory.nearDuplicateCandidates.length],
  ["Scrolling-overlap candidate pairs", inventory.overlapCandidates.length],
] as Array<[string, number]>) console.log(`| ${label} | ${value} |`);

const byType = new Map<string, { count: number; bytes: number }>();
const byFolder = new Map<string, { count: number; bytes: number }>();
for (const row of valid) {
  for (const [map, key] of [[byType, row.format], [byFolder, row.folder]] as const) {
    const item = map.get(key) || { count: 0, bytes: 0 };
    item.count++;
    item.bytes += row.bytes;
    map.set(key, item);
  }
}
console.log("\n| File format | Images | MiB |");
console.log("|---|---:|---:|");
for (const [key, value] of [...byType].sort()) console.log(`| ${key} | ${value.count} | ${(value.bytes / 1048576).toFixed(1)} |`);
console.log("\n| Folder | Images | MiB |");
console.log("|---|---:|---:|");
for (const [key, value] of [...byFolder].sort((a, b) => b[1].count - a[1].count)) console.log(`| ${key.replaceAll("|", "\\|")} | ${value.count} | ${(value.bytes / 1048576).toFixed(1)} |`);
