#!/usr/bin/env python3
"""Pre-render story, chapter and boss narration with neural voices (edge-tts).

Writes assets/audio/voice/<profile>-<hash>.mp3 and manifest.json. The runtime
(assets/ui/errata/voice.js) looks lines up by profile + FNV-1a hash of the text
and falls back to the browser voice when a line is missing, so re-run this after
editing story text:   python3 scripts/build_voice.py [--force]
"""
import asyncio, json, re, sys
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/voice"
AHMET, EMEL, RYAN = "tr-TR-AhmetNeural", "tr-TR-EmelNeural", "en-GB-RyanNeural"

PROFILES = {
    "narrator":   dict(voice=AHMET, rate="-10%", pitch="-2Hz"),
    "hero_inky":  dict(voice=AHMET, rate="+0%",  pitch="+14Hz"),
    "hero_quillmaster": dict(voice=AHMET, rate="-4%", pitch="-3Hz"),
    "hero_word_knight": dict(voice=AHMET, rate="-2%", pitch="-8Hz"),
    "hero_rune_sorceress": dict(voice=EMEL, rate="-2%", pitch="-2Hz"),
    "hero_lexicon_alchemist": dict(voice=EMEL, rate="+0%", pitch="+2Hz"),
    "hero_shadow_lexicographer": dict(voice=AHMET, rate="-8%", pitch="-12Hz"),
    "neris":      dict(voice=EMEL,  rate="+2%",  pitch="+6Hz"),
    "mother":     dict(voice=EMEL,  rate="-12%", pitch="-4Hz"),
    "child":      dict(voice=AHMET, rate="+4%",  pitch="+38Hz"),
    "woman":      dict(voice=EMEL,  rate="-4%",  pitch="+0Hz"),
    "man":        dict(voice=AHMET, rate="-4%",  pitch="-2Hz"),
    "whisper":    dict(voice=AHMET, rate="-20%", pitch="-32Hz"),
    "shadow":     dict(voice=AHMET, rate="-8%",  pitch="-14Hz"),
    "ghost":      dict(voice=AHMET, rate="-10%", pitch="-18Hz"),
    "boss":       dict(voice=AHMET, rate="-14%", pitch="-24Hz"),
    "boss_en":    dict(voice=RYAN,  rate="-12%", pitch="-20Hz"),
}
# speaker id -> profile (exact), then prefix rules; heroes resolve per character.
SPEAKERS = {"narrator": "narrator", "caption": "narrator", "neris": "neris", "whisper": "whisper",
            "blank_page": "whisper", "shadow_double": "shadow", "mother_echo": "mother", "lio_echo": "child",
            "ink_child": "child", "yel": "woman", "mira": "woman", "lira": "woman", "sera": "woman", "ada": "woman",
            "mara": "woman", "tavi": "man", "silent_mechanic": "man"}
PREFIXES = [["boss_", "boss"], ["echo_", "ghost"]]
HEROES = ["hero", "inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]
EFFECTS = {"boss": "hall", "boss_en": "hall", "whisper": "hall", "ghost": "hall", "shadow": "hall"}

def fnv(text):
    """FNV-1a over UTF-16 code units, identical to fnv() in voice.js."""
    h = 0x811c9dc5
    b = text.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xffffffff
    return format(h, "08x")

def tidy(text):  # keep in sync with tidy() in voice.js
    t = re.sub(r"[*_`#>]+", "", str(text))
    t = re.sub(r"\s*[·•|]\s*", ", ", t)
    t = re.sub(r"\(([^)]*)\)", r", \1,", t)
    t = re.sub(r"\s*[—–]\s*", ", ", t)
    t = re.sub(r"\.{3,}", "…", t)
    return re.sub(r"\s+", " ", t).strip()

def hero_profile(char):
    return "hero_" + char if "hero_" + char in PROFILES else "hero_inky"

def profile_for(speaker, char):
    if speaker == "hero": return hero_profile(char)
    if speaker in HEROES: return hero_profile(speaker)
    if speaker in SPEAKERS: return SPEAKERS[speaker]
    for prefix, name in PREFIXES:
        if speaker.startswith(prefix): return name
    return "narrator"

def collect():
    jobs = {}
    def add(profile, text):
        text = tidy(text)
        if text: jobs[f"{profile}-{fnv(text)}"] = (profile, text)
    arc = json.load(open(ROOT / "assets/data/story_arc.json"))
    for char, v in arc["characters"].items():
        for ep in v["episodes"]:
            for speaker, text in ep["beats"]:
                add(profile_for(speaker, char), text)
    game = (ROOT / "game.js").read_text()
    for m in re.finditer(r'narration: "([^"]+)"', game): add("narrator", m.group(1))
    # English boss lines: getBossEntranceLine() returns and the phase callouts.
    for m in re.finditer(r'return "([A-Z][^"]{12,}[.!])";', game[game.index("function getBossEntranceLine"):][:900]): add("boss_en", m.group(1))
    for m in re.finditer(r'speakBossVoiceLine\([^,]+, "([^"]+)"\)', game): add("boss_en", m.group(1))
    return jobs

async def render(key, profile, text, force, sem):
    path = OUT / f"{key}.mp3"
    if path.exists() and path.stat().st_size > 800 and not force: return key, True
    p = PROFILES[profile]
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, p["voice"], rate=p["rate"], pitch=p["pitch"]).save(str(path))
                return key, True
            except Exception as e:
                await asyncio.sleep(1.5 * (attempt + 1))
    return key, False

async def main():
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = collect()
    print(len(jobs), "lines")
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*[render(k, p, t, force, sem) for k, (p, t) in jobs.items()])
    ok = {k for k, good in results if good}
    manifest = {"version": 1, "profiles": {n: {"effect": EFFECTS.get(n, "")} for n in PROFILES},
                "speakers": SPEAKERS, "prefixes": PREFIXES, "heroes": HEROES,
                "lines": {k: f"{k}.mp3" for k in sorted(ok)}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
    print(len(ok), "ok,", len(jobs) - len(ok), "failed")

asyncio.run(main())
