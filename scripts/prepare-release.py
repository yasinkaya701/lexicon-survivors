#!/usr/bin/env python3
"""Stamp local CSS/JS URLs and emit an integrity record for the Pages release.

Run from any directory. No bundler or runtime dependency is needed.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


index = ROOT / "index.html"
html = index.read_text()
entrypoints = {}


def stamp(match):
    attribute, url = match.groups()
    path = ROOT / url.split("?", 1)[0]
    if not path.is_file():
        raise SystemExit(f"Missing entrypoint: {path}")
    relative = path.relative_to(ROOT).as_posix()
    entrypoints[relative] = digest(path)
    return f'{attribute}="{relative}?v={entrypoints[relative][:12]}"'


html = re.sub(r'(src|href)="((?:assets/ui/errata/[^"?]+\.(?:js|css)|game\.js)(?:\?[^" ]*)?)"', stamp, html)
index.write_text(html)
entrypoints["index.html"] = digest(index)
for name in ["assets/ui/errata/arena-v3/manifest.json", "assets/ui/errata/title-scene-v6.webp"]:
    entrypoints[name] = digest(ROOT / name)
release = {
    "version": "2026.11.09-last-errata",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "baseCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "sha256": entrypoints,
}
(ROOT / "release.json").write_text(json.dumps(release, indent=2) + "\n")
print(f"Prepared {release['version']}; {len(entrypoints)} entrypoint hashes recorded.")
