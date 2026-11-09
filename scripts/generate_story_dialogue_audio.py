#!/usr/bin/env python3
"""Generate audio files and manifest for all 600 story dialogue beats in Lexicon Survivors.

Supports ElevenLabs Multilingual v2 with seamless fallback to neural Turkish edge-tts.
Mirrors generated audio files and manifest to build/web/.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import edge_tts
import requests

ROOT = Path(__file__).resolve().parents[1]
STORY_PATH = ROOT / "assets/data/story_arc.json"
SOURCE_AUDIO_DIR = ROOT / "assets/audio/dialogue"
BUILD_AUDIO_DIR = ROOT / "build/web/assets/audio/dialogue"
SOURCE_MANIFEST_PATH = ROOT / "assets/data/story_audio_manifest.json"
BUILD_MANIFEST_PATH = ROOT / "build/web/assets/data/story_audio_manifest.json"

# Voice configurations according to survey & character guide specifications
VOICE_PROFILES: Dict[str, Dict[str, Any]] = {
    "inky": {
        "elevenlabs_voice_id": "IKne3meq5aSn9XLyUdCD",  # Charlie
        "stability": 0.55,
        "similarity_boost": 0.85,
        "style": 0.15,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "+5%",
        "pitch": "+2Hz",
    },
    "quillmaster": {
        "elevenlabs_voice_id": "nPczCjzI2devNBz1zQrb",  # Brian
        "stability": 0.65,
        "similarity_boost": 0.85,
        "style": 0.20,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-5%",
        "pitch": "-3Hz",
    },
    "word_knight": {
        "elevenlabs_voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam
        "stability": 0.70,
        "similarity_boost": 0.80,
        "style": 0.25,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-8%",
        "pitch": "-6Hz",
    },
    "rune_sorceress": {
        "elevenlabs_voice_id": "XB0fDUnXU5powFXDhCwa",  # Charlotte
        "stability": 0.55,
        "similarity_boost": 0.85,
        "style": 0.25,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-EmelNeural",
        "rate": "+0%",
        "pitch": "+2Hz",
    },
    "lexicon_alchemist": {
        "elevenlabs_voice_id": "onwK4e9ZLuTAKqWW03F9",  # Daniel
        "stability": 0.60,
        "similarity_boost": 0.85,
        "style": 0.20,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "+2%",
        "pitch": "-1Hz",
    },
    "shadow_lexicographer": {
        "elevenlabs_voice_id": "JBFqnCBsd6RMkjVDRZzb",  # George
        "stability": 0.60,
        "similarity_boost": 0.80,
        "style": 0.30,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-5%",
        "pitch": "-8Hz",
    },
    "neris": {
        "elevenlabs_voice_id": "XrExE9yKIg1WjnnlVkGX",  # Matilda
        "stability": 0.70,
        "similarity_boost": 0.90,
        "style": 0.10,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-EmelNeural",
        "rate": "-6%",
        "pitch": "-2Hz",
    },
    "whisper": {
        "elevenlabs_voice_id": "D38z5RcWu1voky8WS1ja",  # Fin
        "stability": 0.35,
        "similarity_boost": 0.75,
        "style": 0.60,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-12%",
        "pitch": "-12Hz",
    },
    "shadow_double": {
        "elevenlabs_voice_id": "JBFqnCBsd6RMkjVDRZzb",  # George
        "stability": 0.45,
        "similarity_boost": 0.80,
        "style": 0.45,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-10%",
        "pitch": "-10Hz",
    },
    "lio_echo": {
        "elevenlabs_voice_id": "N2lVS1w4EtoT3dr4eOWO",  # Callum
        "stability": 0.50,
        "similarity_boost": 0.85,
        "style": 0.25,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "+8%",
        "pitch": "+4Hz",
    },
    "mother_echo": {
        "elevenlabs_voice_id": "ThT5KcBeYPX3keUQqHPh",  # Dorothy
        "stability": 0.65,
        "similarity_boost": 0.85,
        "style": 0.20,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-EmelNeural",
        "rate": "-8%",
        "pitch": "-1Hz",
    },
    "witness_female": {
        "elevenlabs_voice_id": "Xb7hH8MSUJpSbSDYk0k2",  # Alice
        "stability": 0.55,
        "similarity_boost": 0.85,
        "style": 0.20,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-EmelNeural",
        "rate": "-2%",
        "pitch": "+0Hz",
    },
    "witness_male": {
        "elevenlabs_voice_id": "TX3LPaxmHKxFdv7VOQHJ",  # Liam
        "stability": 0.55,
        "similarity_boost": 0.85,
        "style": 0.20,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    },
    "boss": {
        "elevenlabs_voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam / Marcus
        "stability": 0.60,
        "similarity_boost": 0.80,
        "style": 0.40,
        "use_speaker_boost": True,
        "edge_voice": "tr-TR-AhmetNeural",
        "rate": "-15%",
        "pitch": "-14Hz",
    },
}


def resolve_voice_profile(campaign_id: str, speaker: str) -> Dict[str, Any]:
    """Resolve character profile settings for dialogue speaker."""
    if speaker == "hero":
        return VOICE_PROFILES.get(campaign_id, VOICE_PROFILES["inky"])
    if speaker == "rune_sorceress":
        return VOICE_PROFILES["rune_sorceress"]
    if speaker == "lexicon_alchemist":
        return VOICE_PROFILES["lexicon_alchemist"]
    if speaker == "shadow_lexicographer":
        return VOICE_PROFILES["shadow_lexicographer"]
    if speaker == "neris":
        return VOICE_PROFILES["neris"]
    if speaker in ("whisper", "blank_page"):
        return VOICE_PROFILES["whisper"]
    if speaker == "shadow_double":
        return VOICE_PROFILES["shadow_double"]
    if speaker == "lio_echo":
        return VOICE_PROFILES["lio_echo"]
    if speaker == "mother_echo":
        return VOICE_PROFILES["mother_echo"]
    if speaker in ("mara", "lira", "sera", "mira", "ada"):
        return VOICE_PROFILES["witness_female"]
    if speaker in ("tavi", "yel", "ink_child", "narrator", "silent_mechanic"):
        return VOICE_PROFILES["witness_male"]
    if speaker.startswith("boss_") or speaker.startswith("echo_"):
        return VOICE_PROFILES["boss"]
    return VOICE_PROFILES["boss"]


class DialogueAudioGenerator:
    def __init__(
        self,
        concurrency: int = 6,
        force: bool = False,
        dry_run: bool = False,
        campaign_filter: Optional[str] = None,
        wave_filter: Optional[int] = None,
        manifest_only: bool = False,
    ):
        self.concurrency = concurrency
        self.force = force
        self.dry_run = dry_run
        self.campaign_filter = campaign_filter
        self.wave_filter = wave_filter
        self.manifest_only = manifest_only
        self.elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        self.elevenlabs_disabled = not bool(self.elevenlabs_api_key)
        self.elevenlabs_checked = False
        self.semaphore = asyncio.Semaphore(concurrency)
        self.completed_count = 0
        self.elevenlabs_success_count = 0
        self.edge_tts_success_count = 0
        self.skipped_count = 0

    def load_all_beats(self) -> List[Dict[str, Any]]:
        """Parse all 600 beats unconditionally from story_arc.json in canonical order."""
        if not STORY_PATH.exists():
            raise FileNotFoundError(f"Story data not found at {STORY_PATH}")

        with open(STORY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        beats: List[Dict[str, Any]] = []
        for campaign_id, campaign_data in data.get("characters", {}).items():
            for ep in campaign_data.get("episodes", []):
                wave = ep.get("wave")
                for beat_idx, beat_item in enumerate(ep.get("beats", []), start=1):
                    speaker = beat_item[0]
                    text = beat_item[1]
                    filename = f"voice_{campaign_id}_w{wave:03d}_b{beat_idx}_{speaker}.mp3"
                    audio_url = f"assets/audio/dialogue/{campaign_id}/{filename}"
                    beats.append(
                        {
                            "campaign": campaign_id,
                            "wave": wave,
                            "beat": beat_idx,
                            "speaker": speaker,
                            "text": text,
                            "filename": filename,
                            "audio_url": audio_url,
                        }
                    )
        return beats

    def filter_beats_to_generate(self, all_beats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter beats for audio generation according to CLI parameters."""
        filtered = all_beats
        if self.campaign_filter:
            filtered = [b for b in filtered if b["campaign"] == self.campaign_filter]
        if self.wave_filter is not None:
            filtered = [b for b in filtered if b["wave"] == self.wave_filter]
        return filtered

    def load_beats(self) -> List[Dict[str, Any]]:
        """Legacy helper returning generation targets."""
        return self.filter_beats_to_generate(self.load_all_beats())

    def load_existing_manifest(self) -> Dict[Tuple[str, int, int], Dict[str, Any]]:
        """Load existing manifest entries keyed by (campaign, wave, beat)."""
        existing: Dict[Tuple[str, int, int], Dict[str, Any]] = {}
        for path in (SOURCE_MANIFEST_PATH, BUILD_MANIFEST_PATH):
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        disk_data = json.load(f)
                    if isinstance(disk_data, list):
                        for item in disk_data:
                            k = (item.get("campaign"), item.get("wave"), item.get("beat"))
                            if all(v is not None for v in k) and k not in existing:
                                existing[k] = item
                except Exception as e:
                    print(f"[Manifest Warning] Could not load existing manifest from {path}: {e}")
        return existing

    def generate_manifest(self) -> List[Dict[str, Any]]:
        """Construct full manifest preserving canonical ordering across all 600 beats.

        Uses keyed dictionary merging on (campaign, wave, beat) so that filtering
        by campaign or wave never drops other character campaigns or existing metadata.
        """
        all_beats = self.load_all_beats()
        existing_map = self.load_existing_manifest()

        manifest_entries: List[Dict[str, Any]] = []
        for b in all_beats:
            k = (b["campaign"], b["wave"], b["beat"])
            base_entry = {
                "campaign": b["campaign"],
                "wave": b["wave"],
                "beat": b["beat"],
                "speaker": b["speaker"],
                "text": b["text"],
                "audio_url": b["audio_url"],
            }
            if k in existing_map:
                merged = dict(existing_map[k])
                merged.update(base_entry)
                manifest_entries.append(merged)
            else:
                manifest_entries.append(base_entry)

            # Auto-sync disk files between source and build if present in one but missing in the other
            source_file = SOURCE_AUDIO_DIR / b["campaign"] / b["filename"]
            build_file = BUILD_AUDIO_DIR / b["campaign"] / b["filename"]
            if source_file.exists() and source_file.stat().st_size > 1024 and not build_file.exists():
                build_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_file, build_file)
            elif build_file.exists() and build_file.stat().st_size > 1024 and not source_file.exists():
                source_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(build_file, source_file)

        # Invariant Assertions
        if len(manifest_entries) != 600:
            print(f"[Manifest WARNING] Manifest count is {len(manifest_entries)} (expected 600)!")
        campaigns = set(e["campaign"] for e in manifest_entries)
        if len(campaigns) != 6:
            print(f"[Manifest WARNING] Campaign count is {len(campaigns)} (expected 6)!")

        return manifest_entries

    def save_manifest(self, manifest_entries: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Write manifest synchronously to both SOURCE_MANIFEST_PATH and BUILD_MANIFEST_PATH."""
        if manifest_entries is None:
            manifest_entries = self.generate_manifest()

        SOURCE_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        BUILD_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

        payload = json.dumps(manifest_entries, ensure_ascii=False, indent=2) + "\n"

        with open(SOURCE_MANIFEST_PATH, "w", encoding="utf-8") as f:
            f.write(payload)

        with open(BUILD_MANIFEST_PATH, "w", encoding="utf-8") as f:
            f.write(payload)

        entry_count = len(manifest_entries)
        campaign_count = len(set(e["campaign"] for e in manifest_entries))
        print(f"[Manifest] Synchronized {entry_count} entries across {campaign_count} campaigns to:")
        print(f"  - {SOURCE_MANIFEST_PATH.relative_to(ROOT)}")
        print(f"  - {BUILD_MANIFEST_PATH.relative_to(ROOT)}")
        return manifest_entries

    def try_elevenlabs_sync(self, text: str, profile: Dict[str, Any], output_path: Path) -> bool:
        """Attempt generation using ElevenLabs Multilingual v2."""
        if self.elevenlabs_disabled:
            return False

        voice_id = profile["elevenlabs_voice_id"]
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        headers = {
            "xi-api-key": self.elevenlabs_api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": profile["stability"],
                "similarity_boost": profile["similarity_boost"],
                "style": profile["style"],
                "use_speaker_boost": profile["use_speaker_boost"],
            },
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code == 200 and len(resp.content) > 1024:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as f:
                    f.write(resp.content)
                self.elevenlabs_success_count += 1
                return True
            elif resp.status_code in (401, 403):
                if not self.elevenlabs_checked:
                    print(
                        f"[ElevenLabs] HTTP {resp.status_code} Unauthorized / permission missing. "
                        f"Seamlessly falling back to local Turkish neural edge-tts."
                    )
                    self.elevenlabs_checked = True
                self.elevenlabs_disabled = True
                return False
            elif resp.status_code in (429, 402):
                print(f"[ElevenLabs] Quota or rate-limit reached ({resp.status_code}). Switching to edge-tts.")
                self.elevenlabs_disabled = True
                return False
            else:
                return False
        except Exception as e:
            return False

    async def generate_edge_tts(self, text: str, profile: Dict[str, Any], output_path: Path) -> bool:
        """Generate audio using neural Turkish edge-tts with retries."""
        voice = profile["edge_voice"]
        rate = profile["rate"]
        pitch = profile["pitch"]

        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
                await comm.save(str(output_path))
                if output_path.exists() and output_path.stat().st_size > 1024:
                    self.edge_tts_success_count += 1
                    return True
            except Exception as e:
                if attempt == max_retries:
                    print(f"[edge-tts ERROR] Failed on {output_path.name}: {e}")
                    return False
                await asyncio.sleep(1.0 * attempt)
        return False

    async def process_beat(self, beat: Dict[str, Any], total_beats: int):
        """Process a single dialogue beat: generation + build mirroring."""
        async with self.semaphore:
            campaign_id = beat["campaign"]
            filename = beat["filename"]
            text = beat["text"]
            speaker = beat["speaker"]

            source_file = SOURCE_AUDIO_DIR / campaign_id / filename
            build_file = BUILD_AUDIO_DIR / campaign_id / filename

            # Check if file already exists with valid size
            if not self.force and source_file.exists() and source_file.stat().st_size > 1024:
                # Ensure mirrored in build
                if not build_file.exists() or build_file.stat().st_size != source_file.stat().st_size:
                    build_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, build_file)
                self.skipped_count += 1
                self.completed_count += 1
                if self.completed_count % 50 == 0 or self.completed_count == total_beats:
                    print(f"[{self.completed_count}/{total_beats}] Progress: {filename} (cached)")
                return

            if self.dry_run:
                self.completed_count += 1
                return

            profile = resolve_voice_profile(campaign_id, speaker)

            # 1. Try ElevenLabs
            success = False
            if not self.elevenlabs_disabled:
                # Run synchronous requests in thread pool
                loop = asyncio.get_running_loop()
                success = await loop.run_in_executor(
                    None, self.try_elevenlabs_sync, text, profile, source_file
                )

            # 2. Fall back to edge-tts if ElevenLabs was unavailable or unsuccessful
            if not success:
                success = await self.generate_edge_tts(text, profile, source_file)

            if not success:
                raise RuntimeError(f"Failed to generate audio for {filename}")

            # Mirror to build/web
            build_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, build_file)

            self.completed_count += 1
            if self.completed_count % 25 == 0 or self.completed_count == total_beats:
                print(f"[{self.completed_count}/{total_beats}] Generated: {filename} ({source_file.stat().st_size} bytes)")

    async def run(self):
        """Main pipeline execution."""
        start_time = time.time()
        all_beats = self.load_all_beats()
        total_all_beats = len(all_beats)

        if self.manifest_only:
            print(f"[Manifest-Only] Rebuilding and validating manifest for {total_all_beats} story beats...")
            manifest_entries = self.generate_manifest()
            self.save_manifest(manifest_entries)
            print(f"[Manifest-Only] Completed in {time.time() - start_time:.2f}s.")
            return

        beats_to_process = self.filter_beats_to_generate(all_beats)
        total_to_process = len(beats_to_process)
        print(f"Loaded {total_all_beats} dialogue beats from {STORY_PATH.relative_to(ROOT)}.")
        if self.campaign_filter or self.wave_filter is not None:
            filter_desc = []
            if self.campaign_filter:
                filter_desc.append(f"campaign='{self.campaign_filter}'")
            if self.wave_filter is not None:
                filter_desc.append(f"wave={self.wave_filter}")
            print(f"Filtering generation to ({', '.join(filter_desc)}): {total_to_process} beats to process.")
        else:
            print(f"Processing all {total_to_process} dialogue beats.")

        if self.dry_run:
            print("DRY-RUN mode enabled. Validating beat profiles without file generation...")
            for b in beats_to_process:
                prof = resolve_voice_profile(b["campaign"], b["speaker"])
                assert prof["edge_voice"] in ("tr-TR-AhmetNeural", "tr-TR-EmelNeural")
                assert prof["elevenlabs_voice_id"]
            print(f"All {total_to_process} beats validated successfully in dry run.")
            return

        # Prepare directories
        SOURCE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        BUILD_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

        print(f"Starting audio generation with concurrency {self.concurrency}...")
        tasks = [self.process_beat(b, total_to_process) for b in beats_to_process]
        await asyncio.gather(*tasks)

        # Write manifest: ALWAYS constructed across all 600 beats regardless of filtering!
        print("[Manifest] Synchronizing manifest across all 600 beats...")
        self.save_manifest()

        elapsed = time.time() - start_time
        print(f"\n--- Generation Summary ---")
        print(f"Total Beats Evaluated: {total_all_beats}")
        print(f"Beats Processed This Run: {total_to_process}")
        print(f"ElevenLabs Generated: {self.elevenlabs_success_count}")
        print(f"Neural Turkish (edge-tts) Generated: {self.edge_tts_success_count}")
        print(f"Skipped / Cached: {self.skipped_count}")
        print(f"Elapsed Time: {elapsed:.2f}s")
        print(f"Source Audio Directory: {SOURCE_AUDIO_DIR}")
        print(f"Build Audio Directory: {BUILD_AUDIO_DIR}")
        print(f"Source Manifest: {SOURCE_MANIFEST_PATH}")
        print(f"Build Manifest: {BUILD_MANIFEST_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Generate 600 dialogue audio clips and manifest.")
    parser.add_argument("--concurrency", type=int, default=6, help="Concurrent generation workers (default: 6)")
    parser.add_argument("--force", action="store_true", help="Force overwrite existing audio files")
    parser.add_argument("--dry-run", action="store_true", help="Validate beats and configurations without generating")
    parser.add_argument("--campaign", type=str, default=None, help="Filter to a specific campaign (e.g. inky)")
    parser.add_argument("--wave", type=int, default=None, help="Filter to a specific wave (e.g. 5)")
    parser.add_argument("--manifest-only", action="store_true", help="Only synchronize and rebuild manifest without generating audio")
    args = parser.parse_args()

    generator = DialogueAudioGenerator(
        concurrency=args.concurrency,
        force=args.force,
        dry_run=args.dry_run,
        campaign_filter=args.campaign,
        wave_filter=args.wave,
        manifest_only=args.manifest_only,
    )
    asyncio.run(generator.run())


if __name__ == "__main__":
    main()
