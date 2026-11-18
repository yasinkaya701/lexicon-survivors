#!/usr/bin/env python3
"""Stamp every local .js/.css in index.html with a content hash (?v=...).
Run from the repo root before deploying:  python3 tools/stamp_html.py
(also run tools/art/stamp_atlas.py after rebuilding the web art)."""
import hashlib, re
from pathlib import Path
html = Path("index.html")
def stamp(m):
    path = m.group(2).split("?")[0]
    f = Path(path)
    return f'{m.group(1)}="{path}?v={hashlib.md5(f.read_bytes()).hexdigest()[:10]}"' if f.is_file() else m.group(0)
html.write_text(re.sub(r'(src|href)="((?:assets|game)[^"]*?\.(?:js|css)(?:\?[^"]*)?)"', stamp, html.read_text()))
