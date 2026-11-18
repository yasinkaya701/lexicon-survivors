#!/usr/bin/env python3
"""Append a content hash (?v=...) to every src in the Grimoire atlas.

GitHub Pages and browsers cache images aggressively, so regenerated WebP art kept
showing the old pictures. The hash changes only when a file's bytes change, so
unchanged art stays cached. Idempotent; re-run after build_web_art.py:
    python3 tools/art/stamp_atlas.py
"""
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "assets/art/grimoire"
data = json.loads((ART / "atlas.json").read_text())
changed = missing = 0
for record in data["assets"].values():
    path = record["src"].split("?", 1)[0]
    file = ROOT / path
    if not file.exists():
        missing += 1
        continue
    record["src"] = f"{path}?v={hashlib.md5(file.read_bytes()).hexdigest()[:8]}"
    changed += 1
dump = json.dumps(data, separators=(",", ":"), sort_keys=True)
(ART / "atlas.json").write_text(dump)
(ART / "atlas.js").write_text("window.GRIMOIRE_ATLAS=" + dump + ";\n")
print(f"stamped {changed} assets, {missing} missing files")
