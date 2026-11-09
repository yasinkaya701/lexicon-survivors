#!/usr/bin/env python3
"""Build the text-only production manifest for the 600 story-panel images.

This script never creates, edits, or uploads image files. It turns the current
six character arcs into one separately addressable art request per comic panel.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORY_PATH = ROOT / "assets/data/story_arc.json"
EXPANSION_PATH = ROOT / "assets/data/story_expansion.json"
OUTPUT_PATH = ROOT / "assets/data/story_art_600_manifest.json"
MASTER_ART_PROMPT = "docs/story-art-600/master-art-prompt.md"

CHARACTERS = {
    "inky": {
        "display_name": "Inky",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_inky.png",
        "story_reference_image": "docs/story-art-600/references/inky.png",
        "identity_lock": (
            "Small, youthful adult scholar with a bright, readable face; deep cobalt-blue robe; "
            "short blue cape; pointed cobalt hat with a crisp gold brim and one small gold quill pin; "
            "simple belt and compact silhouette. Preserve the in-game blue-and-gold color blocks. "
            "Keep Inky visually distinct from Neris and from every other hero."
        ),
        "campaign": "Mira'yı bulmak; onun adına karar vermeden, kendi seçimini ve ortak anılarının gerçekliğini öğrenmek.",
        "palette": ["cobalt blue", "warm gold", "parchment cream", "ink black"],
    },
    "quillmaster": {
        "display_name": "Quillmaster",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_quillmaster.png",
        "story_reference_image": "docs/story-art-600/references/quillmaster.png",
        "identity_lock": (
            "Lean adult duelist in a dark wine-red coat, black gloves and narrow boots; dark hair; "
            "a short white feathered quill cap angled over the brow. Carry a slim quill-rapier. "
            "Keep the red, charcoal and ivory silhouette from the in-game sprite; never borrow Inky's hat."
        ),
        "campaign": "Ada'yı geri çağırmak yerine, ona verdiği emirlerin izini sürüp kız kardeşinin kendi yolunu seçme hakkını kabul etmek.",
        "palette": ["wine red", "charcoal", "ivory", "old brass"],
    },
    "word_knight": {
        "display_name": "Word Knight",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_word_knight.png",
        "story_reference_image": "docs/story-art-600/references/word_knight.png",
        "identity_lock": (
            "Broad, compact adult knight in polished silver plate; unmistakable blue helmet with a "
            "short red plume; deep teal-green cape; round brass-rimmed shield and a heavy dictionary blade. "
            "Preserve the silver/blue/red read of the game sprite and its grounded, weighty posture."
        ),
        "campaign": "Eski nöbet yeminindeki zorlayıcı emri açığa çıkarıp kapıları korumayı insanların seçim hakkını korumaya dönüştürmek.",
        "palette": ["silver", "deep teal", "signal red", "brass"],
    },
    "rune_sorceress": {
        "display_name": "Rune Sorceress",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_rune_sorceress.png",
        "story_reference_image": "docs/story-art-600/references/rune_sorceress.png",
        "identity_lock": (
            "Clearly adult woman mage with a calm, focused expression; layered midnight-blue robes; "
            "pale blue hood and crescent-shaped hat; fine gold edging; a violet rune-orb held near one hand. "
            "Use the in-game blue-and-violet identity. Her mother Lale is older, silver-lavender, and never a duplicate."
        ),
        "campaign": "Annesi Lale'nin kayboluşunu izlemek ve onun seçimini, geride bıraktığı mühürleri çözerek anlamak.",
        "palette": ["midnight blue", "amethyst", "pale cyan", "antique gold"],
    },
    "lexicon_alchemist": {
        "display_name": "Alchemist",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_alchemist.png",
        "story_reference_image": "docs/story-art-600/references/alchemist.png",
        "identity_lock": (
            "Adult woman field alchemist in a moss-green hood and short green mantle; warm brown leather "
            "belt with two or three glass vials; one small round brass lens/goggle; sturdy gloves. "
            "Keep the green-and-ochre game-sprite silhouette. Avoid adding a large hat or a wizard staff."
        ),
        "campaign": "Kardeşi Lio'nun anısını bir şişede hapsetmeden, onu kendi sesi ve tercihleriyle serbest bırakmak.",
        "palette": ["moss green", "ochre", "glass teal", "copper"],
    },
    "shadow_lexicographer": {
        "display_name": "Shadow Scribe",
        "sprite_reference": "assets/sprites/upgrade_v1/hero_shadow_scribe.png",
        "story_reference_image": "docs/story-art-600/references/shadow_scribe.png",
        "identity_lock": (
            "Slim adult shadow-lexicographer in a close black hood, face mostly in shadow with one cool-blue "
            "eye glint; a single deep-red scarf tail and red accent on the dark coat; narrow calligraphy katana. "
            "Keep the black/red silhouette from the game sprite. The double has the same build, not a new monster."
        ),
        "campaign": "Kendi yazmadığı emirleri ve Neris'in kaydındaki izi izleyip gölgesiyle eşit söz hakkını paylaşmak.",
        "palette": ["ink black", "deep red", "cold blue", "smoke gray"],
    },
}

NPC_REFERENCES = {
    "neris": (
        "Neris is a clearly adult woman: dark wavy hair tied low with one distinct silver forelock, "
        "green eyes, a tiny ink mark on her left cheek, forest-green archivist coat, cream ruffled collar, "
        "small antique-gold key pendant and a narrow shoulder strap. Keep her face and silhouette consistent."
    ),
    "mira": (
        "Mira is a separate adult woman, not Neris: short copper-brown curls, warm amber eyes, "
        "indigo-blue scarf, ink-stained cuffs and a small star-shaped pen charm. Her body language is independent, "
        "often turned toward a door she chose herself."
    ),
    "ada": (
        "Ada is a distinct young adult woman: short auburn bob, red-brown work jacket, a pale thread bracelet "
        "with two knots, quick observant eyes. Her posture shows agency; she is never framed as an object to retrieve."
    ),
    "lale": (
        "Lale is Rune Sorceress's mother, an older woman with silver-lavender hair, a violet ceremonial mantle, "
        "weathered hands and a cracked family seal. Keep her older than the hero and visually unmistakable."
    ),
    "lio": (
        "Lio is Alchemist's younger brother: a young man with short unruly chestnut curls, freckles, "
        "a faded sea-green laboratory coat and mismatched glove cuffs. Draw him as a warm memory, not a childlike mascot."
    ),
    "shadow_double": (
        "Shadow Double matches Shadow Scribe's height, hood and face shape exactly, but is edged by a muted "
        "wine-red rim light and stands as an equal person, not a hostile clone or a possession."
    ),
    "blank_page": (
        "Blank Page / Whisper is a quiet adult-height figure in layered ivory paper-fiber robes, with a smooth "
        "unmarked void where a face would be. Use folded page edges and negative space only; no letters, file icons, "
        "emoji, logos, fake writing, or monster-mouth caricature."
    ),
}

NPC_STORY_IMAGES = {
    "neris": "docs/story-art-600/references/npcs/neris.png",
    "mira": "docs/story-art-600/references/npcs/mira.png",
    "ada": "docs/story-art-600/references/npcs/ada.png",
    "lale": "docs/story-art-600/references/npcs/lale.png",
    "lio": "docs/story-art-600/references/npcs/lio.png",
    "shadow_double": "docs/story-art-600/references/npcs/shadow_double.png",
    "blank_page": "docs/story-art-600/references/npcs/blank_page.png",
    "sera": "docs/story-art-600/references/npcs/extra/sera.png",
    "mara": "docs/story-art-600/references/npcs/extra/mara.png",
    "yel": "docs/story-art-600/references/npcs/extra/yel.png",
    "tavi": "docs/story-art-600/references/npcs/extra/tavi.png",
    "lira": "docs/story-art-600/references/npcs/extra/lira.png",
    "ink_child": "docs/story-art-600/references/npcs/extra/murekkep-cocugu.png",
    "silent_mechanic": "docs/story-art-600/references/npcs/extra/dilsiz-tamirci.png",
}

# Exact encounter order and skill IDs from scripts/wave_manager.gd. Comic scenes
# follow these existing solo fights; the story never inserts another boss.
BOSS_ROSTER = [
    (5, "boss_red_pen_boss", "Red Pen Boss", "KIRMIZI MÜFETTİŞ", "judgment", "red_pen_inquisitor", "upgrade_v2/boss_red_inquisitor.png"),
    (10, "boss_syntax_titan", "Syntax Titan", "YARIM KALAN DEV", "quake", "syntax_titan", "upgrade_v2/boss_syntax_titan.png"),
    (15, "boss_oxymoron_ogre", "Oxymoron Ogre", "ÇELİŞKİ", "nova", "oxymoron_ogre", "oxymoron_ogre.png"),
    (20, "boss_homophone_harpy", "Homophone Harpy", "İKİ SESLİ HARPY", "fan", "homophone_harpy", "upgrade_v1/monster_homophone_harpy.png"),
    (25, "boss_lexicon_dragon_boss", "Lexicon Dragon Boss", "LEKSİKON EJDERHASI", "orbit", "lexicon_dragon", "upgrade_v2/boss_lexicon_dragon.png"),
    (30, "boss_run_on_reaper", "Run-on Reaper", "DURAKSIZ ORAKÇI", "charge", "run_on_reaper", "upgrade_v1/monster_run_on_reaper.png"),
    (35, "boss_malapropism_mimic", "Malapropism Mimic", "ÖDÜNÇ YÜZ", "mirror", "malapropism_mimic", "malapropism_mimic.png"),
    (40, "boss_vocabulary_void", "Vocabulary Void", "SÖZCÜKSÜZ AĞIZ", "gravity", "vocabulary_void", "upgrade_v2/boss_void_curator.png"),
    (45, "boss_punctuation_phantom", "Punctuation Phantom", "SON NOKTA", "crossfire", "punctuation_phantom", "upgrade_v1/monster_punctuation_phantom.png"),
    (50, "boss_double_negative_drake", "Double Negative Drake", "ÇİFTE YADSIMA", "rift", "double_negative_drake", "upgrade_v1/monster_double_negative_drake.png"),
    (55, "boss_palindrome_phantom", "Palindrome Phantom", "TERS YANSI", "return", "palindrome_phantom", "palindrome_phantom.png"),
    (60, "boss_tautology_twin", "Tautology Twin", "YİNELENEN İKİZ", "echo", "tautology_twin", "upgrade_v1/monster_tautology_twin.png"),
    (65, "boss_dangling_modifier", "Dangling Modifier", "ASKIDA CÜMLE", "snare", "dangling_modifier", "upgrade_v1/monster_dangling_modifier.png"),
    (70, "boss_spelling_spectre", "Spelling Spectre", "SOLUK DÜZELTMEN", "shards", "spelling_spectre", "upgrade_v1/monster_spelling_spectre.png"),
    (75, "boss_idiom_imp", "Idiom Imp", "HARFÎ ALEV", "embers", "idiom_imp", "upgrade_v1/monster_idiom_imp.png"),
    (80, "boss_red_pen_boss", "Red Pen Boss", "KIRMIZI REDAKTÖR", "sever", "red_pen_inquisitor", "upgrade_v2/boss_red_inquisitor.png"),
    (85, "boss_oxymoron_ogre", "Oxymoron Ogre", "İKİLİ GERÇEK", "split", "oxymoron_ogre", "oxymoron_ogre.png"),
    (90, "boss_malapropism_mimic", "Malapropism Mimic", "YANLIŞ NERİS", "eclipse", "malapropism_mimic", "malapropism_mimic.png"),
    (95, "boss_vocabulary_void", "Vocabulary Void", "YAZILMAMIŞ", "void_bloom", "vocabulary_void", "upgrade_v2/boss_void_curator.png"),
    (100, "boss_lexicon_dragon_boss", "Lexicon Dragon Boss", "OMEGA · SON SÖZ", "finale", "lexicon_dragon", "upgrade_v2/boss_lexicon_dragon.png"),
]
BOSS_BY_WAVE = {
    wave: {"id": boss_id, "type": boss_type, "name": boss_name, "skill_id": skill_id,
           "reference_image": f"docs/story-art-600/references/bosses/{slug}.png",
           "reference_sprite": f"assets/sprites/{sprite}"}
    for wave, boss_id, boss_type, boss_name, skill_id, slug, sprite in BOSS_ROSTER
}
BOSS_SPEAKER_IMAGES = {
    boss_id: f"docs/story-art-600/references/bosses/{slug}.png"
    for _, boss_id, _, _, _, slug, _ in BOSS_ROSTER
}
NPC_REFERENCE_NOTES = {
    "sera": "Sera, adult courier with a burnt-orange route satchel and two-notch envelope shears; alert, quick, protective of other people's addresses.",
    "mara": "Mara, adult former passage witness carrying a repaired hand lantern with one mismatched glass pane; steady but guarded, with a practical travel coat.",
    "yel": "Yel, adult map restorer with an inverted brass measuring compass and rolled route papers; ink-stained fingertips, asymmetrical work apron, observant posture.",
    "tavi": "Tavi, adult laboratory assistant in a stained split-color apron, carrying a cracked measuring cup; wary of the Alchemist and not eager to forgive.",
    "lira": "Lira, adult former watch guard in worn slate armor with a removed insignia and a short baton; calm, candid, and able to leave without permission.",
    "ink_child": "The Ink Child is a young adult courier in a plain charcoal coat with a threaded note pouch; do not make them a child mascot or copy any hero costume.",
    "silent_mechanic": "The Silent Mechanic is an adult archive engineer in a soot-dark repair apron with brass calipers and a small pointer; communicates through deliberate gestures.",
}

PANEL_STAGING = {
    1: "Establish the specific place with a wide cinematic view; make the episode's distinctive clue readable as an object, not as text.",
    2: "Move closer to the protagonist and the clue; use an over-shoulder or three-quarter view that shows a deliberate physical choice.",
    3: "Make the named speaker's reaction the emotional center; use expressive silhouette, hands and eye direction, with a unique foreground prop.",
    4: "Raise tension through a boss remnant, false memory, shadow or environmental change that belongs to this episode; do not repeat a prior panel's framing.",
    5: "Close on the consequence and a new visual hook toward the next chapter; leave room for the game's separate dialogue overlay.",
}

ACTS = [
    (5, 25, "I — First trace", "The hero discovers a clue and learns the Library is altering records, not merely hiding them."),
    (30, 50, "II — The borrowed answer", "The Library offers a comforting false version of the relationship; the hero rejects forced closure and earns the second memory."),
    (55, 75, "III — The witness", "A boss or echo reveals their own fear and history. Victory means hearing the witness and choosing what to carry forward."),
    (80, 95, "IV — Shared authorship", "The hero stops treating another person as a destination or reward and makes room for their independent choice."),
    (100, 100, "V — Open ending", "The hero decides how the record continues. The ending preserves uncertainty and agency instead of erasing it."),
]

def act_for_wave(wave: int) -> tuple[str, str]:
    for start, end, title, summary in ACTS:
        if start <= wave <= end:
            return title, summary
    return "Interlude", "A clue changes the character's understanding of the Library."

def speaker_anchor(speaker: str, hero_id: str) -> str:
    if speaker in (hero_id, "hero"):
        return CHARACTERS[hero_id]["identity_lock"]
    speaker = {
        "whisper": "blank_page",
        "mother_echo": "lale",
        "lio_echo": "lio",
    }.get(speaker, speaker)
    if speaker in NPC_REFERENCES:
        return NPC_REFERENCES[speaker]
    if speaker in NPC_REFERENCE_NOTES:
        return NPC_REFERENCE_NOTES[speaker]
    if speaker.startswith("boss_"):
        roster = next((entry for entry in BOSS_ROSTER if entry[1] == speaker), None)
        boss_name = roster[2] if roster else speaker.removeprefix("boss_").replace("_", " ")
        return (
            f"Use the already approved in-game boss model for {boss_name}; preserve its exact silhouette, material, face and combat motif. "
            "This scene follows its solo fight: show aftermath or a wary witness, never a second boss encounter."
        )
    if speaker in ("caption", "narrator"):
        return "No speaking character is required; tell this beat through its authored environment and one clear story prop."
    return f"Depict {speaker.replace('_', ' ')} with a distinct, story-specific silhouette; do not invent lettering or a file-shaped symbol."

def build_manifest() -> dict:
    story = json.loads(STORY_PATH.read_text(encoding="utf-8"))
    expansion = json.loads(EXPANSION_PATH.read_text(encoding="utf-8"))
    boss_story_by_wave = {int(item["wave"]): item for item in expansion["boss_encounters"]}
    if story.get("version") != 2 or story.get("panel_count") != 5 or len(story.get("characters", {})) != 6:
        raise ValueError("story_arc.json must remain six character arcs with five panels per episode")
    if len(boss_story_by_wave) != 20 or set(boss_story_by_wave) != {int(item[0]) for item in BOSS_ROSTER}:
        raise ValueError("story_expansion.json must describe all 20 existing solo boss waves")

    images: list[dict] = []
    for character_id, arc in story["characters"].items():
        profile = CHARACTERS[character_id]
        if len(arc["episodes"]) != 20:
            raise ValueError(f"{character_id} needs exactly 20 episodes")
        for episode_index, episode in enumerate(arc["episodes"], start=1):
            if len(episode.get("beats", [])) != 5:
                raise ValueError(f"{character_id} wave {episode['wave']} needs exactly five beats")
            act, act_summary = act_for_wave(int(episode["wave"]))
            boss = BOSS_BY_WAVE[int(episode["wave"])]
            boss_story = boss_story_by_wave[int(episode["wave"])]
            for panel_index, beat in enumerate(episode["beats"], start=1):
                speaker, dialogue = beat
                asset_id = f"story_{character_id}_wave_{int(episode['wave']):03d}_panel_{panel_index:02d}"
                output_path = f"assets/sprites/story/panels_600/{character_id}/wave_{int(episode['wave']):03d}_panel_{panel_index:02d}.webp"
                # Keep the web destination explicit and stable for later wiring.
                web_path = f"build/web/assets/sprites/story/panels_600/{character_id}/wave_{int(episode['wave']):03d}_panel_{panel_index:02d}.webp"
                anchor = speaker_anchor(str(speaker), character_id)
                supporting_story_id = str(speaker)
                if supporting_story_id in ("whisper", "mother_echo", "lio_echo"):
                    supporting_story_id = {"whisper": "blank_page", "mother_echo": "lale", "lio_echo": "lio"}[supporting_story_id]
                supporting_story = expansion["supporting_cast"].get(supporting_story_id)
                speaker_reference_image = NPC_STORY_IMAGES.get(str(speaker))
                if speaker_reference_image is None:
                    normalized_speaker = {"whisper": "blank_page", "mother_echo": "lale", "lio_echo": "lio"}.get(str(speaker))
                    if normalized_speaker:
                        speaker_reference_image = NPC_STORY_IMAGES[normalized_speaker]
                if speaker_reference_image is None:
                    speaker_reference_image = BOSS_SPEAKER_IMAGES.get(str(speaker))
                prompt = (
                    "Create exactly ONE finished, hand-crafted high-resolution pixel-art graphic-novel panel, "
                    "16:9 landscape, for the Lexicon Survivors game. This is a single scene image, never a "
                    "contact sheet, sprite sheet, collage, UI mockup or icon.\n\n"
                    "REFERENCE FILE: use the exact 64x64 in-game sprite at the reference_sprite path supplied with this record. "
                    f"Use {profile['story_reference_image']} as the approved high-detail story character model reference; "
                    "the sprite is authoritative for gameplay identity and palette while this model sheet locks the expanded story design. "
                    + (f"Use {speaker_reference_image} as the named speaker's exact visual reference. " if speaker_reference_image else "")
                    + f"For boss continuity, consult the exact in-game sprite {boss['reference_sprite']} and detailed model sheet {boss['reference_image']} ({boss['type']}; {boss['skill_id']} skill). "
                    "The boss was defeated in the preceding solo fight; depict it only when this beat's scene canon calls for it, and never stage another fight. "
                    + "Use docs/story-art-600/character-model-sheets.md for the written drawing model and "
                    "docs/story-art-600/character-reference-gallery.html to compare all six playable heroes. "
                    "Treat those game files as the identity source; do not invent a replacement design.\n\n"
                    f"CAMPAIGN: {profile['display_name']} — {profile['campaign']}\n"
                    f"ACT: {act}. {act_summary}\n"
                    f"EPISODE {episode['wave']} — {episode['title']}. LOCATION: {episode['location']}.\n"
                    f"SCENE CANON: {episode.get('scene', '')}\n"
                    f"THIS PANEL'S DIALOGUE (context only; never draw or letter it): {speaker}: {dialogue}\n\n"
                    f"BOSS STORY CANON: {boss_story['title']}; motive: {boss_story['motive']} "
                    f"Combat metaphor: {boss_story['combat_story']} Reveal after defeat: {boss_story['reveal']} "
                    f"Keepsake: {boss_story['keepsake']} Do not depict the preceding fight again unless the current panel's scene canon explicitly shows a memory.\n"
                    + (f"SUPPORTING CHARACTER CANON: {supporting_story['role']} Desire: {supporting_story['desire']} Boundary: {supporting_story['boundary']} " if supporting_story else "")
                    + "\n"
                    f"CHARACTER MODEL LOCK: {anchor}\n"
                    f"HERO MODEL LOCK: {profile['identity_lock']}\n"
                    f"PANEL COMPOSITION: {PANEL_STAGING[panel_index]} Compose this frame around the exact speaker and physical action above. "
                    "Make the background architecture and prop arrangement specific to this episode. Enrich the room with story-relevant shelves, stairways, "
                    "stained glass, maps, bound books, lamps, worked wood, worn cloth, brass fittings, dust and shaped light. Every prop must support the scene; "
                    "do not add ornamental noise. Use a fresh camera angle, silhouette grouping, lighting pattern and focal object unlike the other 599 panels. "
                    "Make the emotional beat readable even at thumbnail size.\n\n"
                    "ART DIRECTION: premium, visibly hand-authored pixel art matching the attached actual in-game reference sprite exactly in silhouette, "
                    f"with a richer {', '.join(profile['palette'])} palette, deliberate pixel clusters, crisp stepped contours, "
                    "distinct pixel texture for each material, controlled light and shadow, and expressive eyes and hands. Draw a more detailed, expressive version of the same model, "
                    "preserving costume, signature prop, apparent age, gender presentation and proportions. Compose at 640x360 logical pixels "
                    "then enlarge exactly 2x with nearest-neighbor to 1280x720. Keep a consistent pixel-cluster scale and crisp stepped edges. "
                    "Mysterious dark-fantasy library atmosphere with readable silhouettes, layered but intentional set dressing and composed light; it should look like skilled pixel-artist work, "
                    "not a filtered-upscaled sprite, generic AI fantasy art or a pile of decorative detail. No blur, airbrush, photorealism, vector gradients, "
                    "painterly smearing, random noise, AI artifacts, neon, excessive bloom or invented iconography. "
                    "For magical seals, use abstract geometric marks only; never imitate writing.\n\n"
                    "ABSOLUTE EXCLUSIONS: no visible writing, letters, numbers, glyph-like pseudo-text, captions, speech bubbles, watermarks, "
                    "brand marks, file icons, folder icons, emoji, HUD, interface, borders, frames or decorative symbols that resemble text. "
                    "Leave character names and all dialogue to the game's separate comic UI. Keep faces/hands anatomically clean within pixel-art rules.\n\n"
                    "OUTPUT: one opaque 16:9 image at 1280x720, PNG source for approval; final game export will be optimized to WebP after review. "
                    "Do not upscale with smoothing; preserve sharp pixel edges."
                )
                images.append({
                    "id": asset_id,
                    "character_id": character_id,
                    "character_name": profile["display_name"],
                    "reference_sprite": profile["sprite_reference"],
                    "story_reference_image": profile["story_reference_image"],
                    "story_model_sheet": "docs/story-art-600/character-model-sheets.md",
                    "episode_index": episode_index,
                    "wave": int(episode["wave"]),
                    "episode_title": episode["title"],
                    "act": act,
                    "act_summary": act_summary,
                    "location": episode["location"],
                    "scene_canon": episode.get("scene", ""),
                    "panel_index": panel_index,
                    "speaker_id": speaker,
                    "boss_id": boss["id"],
                    "boss_type": boss["type"],
                    "boss_name": boss["name"],
                    "boss_skill_id": boss["skill_id"],
                    "boss_reference_sprite": boss["reference_sprite"],
                    "boss_reference_image": boss["reference_image"],
                    "dialogue_context_only": dialogue,
                    "panel_staging": PANEL_STAGING[panel_index],
                    "continuity_reference": anchor,
                    "speaker_reference_image": speaker_reference_image,
                    "boss_story_canon": boss_story,
                    "supporting_character_story_canon": supporting_story,
                    "prompt": prompt,
                    "expected_source_path": output_path,
                    "expected_web_path": web_path,
                    "status": "requested_not_generated",
                    "qa": {
                        "unique_composition": "pending",
                        "character_match": "pending",
                        "pixel_art_edges": "pending",
                        "no_text_or_file_icons": "pending",
                        "story_beat_match": "pending",
                        "source_web_parity": "pending",
                    },
                })

    paths = [item["expected_source_path"] for item in images]
    ids = [item["id"] for item in images]
    if len(images) != 600 or len(set(paths)) != 600 or len(set(ids)) != 600:
        raise ValueError(f"Expected 600 unique panel requests, found {len(images)}")

    return {
        "schema_version": 1,
        "title": "Lexicon Survivors — 600-panel story art commission",
        "requested_images": 600,
        "generated_images": 0,
        "generated_character_references": len(CHARACTERS),
        "generated_npc_references": len(NPC_STORY_IMAGES),
        "generated_boss_references": len({item[5] for item in BOSS_ROSTER}),
        "generated_reference_images": len(CHARACTERS) + len(NPC_STORY_IMAGES) + len({item[5] for item in BOSS_ROSTER}),
        "image_policy": "Each record is a separate image request. Do not combine prompts into atlases or reuse an image.",
        "source_story_version": story["version"],
        "narrative_expansion_source": "assets/data/story_expansion.json",
        "panel_count_per_episode": 5,
        "character_count": 6,
        "episodes_per_character": 20,
        "style_lock": "Hand-authored high-quality pixel art that matches the exact in-game sprite identity; 640x360 logical canvas enlarged 2x nearest-neighbor to 1280x720; consistent crisp cluster scale and no in-image text/UI.",
        "master_art_prompt": MASTER_ART_PROMPT,
        "reference_characters": CHARACTERS,
        "story_model_sheets": "docs/story-art-600/character-model-sheets.md",
        "story_character_references": {key: value["story_reference_image"] for key, value in CHARACTERS.items()},
        "reference_gallery": "docs/story-art-600/character-reference-gallery.html",
        "reference_npcs": NPC_REFERENCES,
        "story_npc_references": NPC_STORY_IMAGES,
        "milestone_boss_roster": [
            {"wave": wave, "boss_id": boss_id, "boss_type": boss_type, "boss_name": boss_name,
             "skill_id": skill_id, "reference_image": f"docs/story-art-600/references/bosses/{slug}.png",
             "reference_sprite": f"assets/sprites/{sprite}"}
            for wave, boss_id, boss_type, boss_name, skill_id, slug, sprite in BOSS_ROSTER
        ],
        "boss_story_arcs": expansion["boss_encounters"],
        "supporting_cast_arcs": expansion["supporting_cast"],
        "upload_policy": {
            "source": "Keep approved lossless PNG originals in an external/source archive, not in the runtime download path.",
            "runtime_format": "After human visual approval, export a 1280x720 WebP with pixel edges preserved; target <= 300 KB each.",
            "lazy_loading": "Load only the active comic panel image and at most the next panel; never preload all 600 images.",
            "source_folder": "assets/sprites/story/panels_600/<character_id>/",
            "web_mirror": "build/web/assets/sprites/story/panels_600/<character_id>/",
            "runtime_wiring": "When approved files exist, map each five-dialogue beat to its own image; never point the runtime at a missing requested file.",
        },
        "images": images,
    }

def main() -> None:
    manifest = build_manifest()
    OUTPUT_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest['requested_images']} image requests (0 images generated): {OUTPUT_PATH.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
