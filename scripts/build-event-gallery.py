#!/usr/bin/env python3
"""Turn a folder of phone photos into the Events page gallery.

  python3 scripts/build-event-gallery.py ~/Desktop/astral-photos

For every photo it writes a web-sized WebP and a small thumbnail into
images/events/astral/ and updates images/events/astral/gallery.json, which
events.html reads. Re-run it with more photos at any time: photos already in
the gallery are skipped. Then commit and push as usual.

Options:  --reset   start the gallery over instead of adding to it
          --alt "text"   alt text for these photos (default: Astral Paints live event)
"""
import argparse, hashlib, json, pathlib, sys
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener  # iPhone HEIC support, if installed
    register_heif_opener()
except ImportError:
    pass

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "events" / "astral"
EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
FULL, THUMB = 1800, 640

ap = argparse.ArgumentParser()
ap.add_argument("folder")
ap.add_argument("--reset", action="store_true")
ap.add_argument("--alt", default="Astral Paints live event")
a = ap.parse_args()

src = pathlib.Path(a.folder).expanduser()
if not src.is_dir():
    sys.exit(f"Folder not found: {src}")
OUT.mkdir(parents=True, exist_ok=True)
manifest_path = OUT / "gallery.json"
manifest = [] if a.reset or not manifest_path.exists() else json.loads(manifest_path.read_text())
seen = {m["id"] for m in manifest}

added = 0
for f in sorted(p for p in src.iterdir() if p.suffix.lower() in EXT and not p.name.startswith(".")):
    pid = hashlib.sha1(f.read_bytes()).hexdigest()[:10]
    if pid in seen:
        continue
    try:
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    except Exception as e:
        print(f"skip {f.name}: {e}")
        continue
    full = im.copy(); full.thumbnail((FULL, FULL), Image.LANCZOS)
    thumb = im.copy(); thumb.thumbnail((THUMB, THUMB * 2), Image.LANCZOS)
    full.save(OUT / f"{pid}.webp", quality=82, method=6)
    thumb.save(OUT / f"{pid}-t.webp", quality=78, method=6)
    manifest.append({"id": pid, "src": f"images/events/astral/{pid}.webp",
                     "thumb": f"images/events/astral/{pid}-t.webp",
                     "w": thumb.size[0], "h": thumb.size[1], "alt": a.alt})
    seen.add(pid); added += 1

manifest_path.write_text(json.dumps(manifest, indent=1))
print(f"added {added} photo(s); gallery now has {len(manifest)} -> {manifest_path.relative_to(ROOT)}")
