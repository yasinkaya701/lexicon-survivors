# Gameplay and Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the shop countdown when a quiz opens, prioritize ranged threats in weapon targeting, and add automatic word, story, chapter, and boss speech using device Web Speech voices.

**Architecture:** Keep the existing single-file browser game architecture. Add a small shared speech helper in `game.js`, call it from quiz/story/chapter/boss events, and add accessible replay controls in `index.html`. Keep countdown and targeting changes isolated from speech behavior.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, Web Speech API (`speechSynthesis`, `SpeechSynthesisUtterance`).

**Spec:** `docs/superpowers/specs/2026-11-08-gameplay-and-voice-design.md`

## Global Constraints

- No third-party TTS service, dependency, or bundled audio asset.
- If speech synthesis or a matching voice is unavailable, gameplay continues normally.
- Quiz words are spoken in English; story and chapter text use Turkish; boss speech uses a lower, slower voice profile.
- Opening a quiz clears the shop auto-wave timer, and closing the quiz does not restart it.
- Preserve the existing elite/boss preference for `grammar_sniper` and `archivist_compass`.
- Do not add or run tests unless the user asks; use focused source review for verification.

## Review Focus

- Countdown expiry while the quiz is visible: `openQuiz()` must clear the live interval before any quiz interaction.
- Browsers without speech synthesis or delayed voice availability: every caller must tolerate missing voices and API support.
- Repeated quiz opens and story panel changes: only the newest utterance should continue; the previous one must stop.
- Multiple milestone bosses: one encounter must not trigger a stack of overlapping spoken lines.
- General target selection: ordinary swarms must not mask ranged enemies, and the existing elite/boss-special weapon behavior must remain intact.

---

### Task 1: Stop auto-wave countdown when a quiz opens

**Files:**
- Modify: `game.js` (`openQuiz`)

**Interfaces:**
- Consumes: existing `clearShopAutoWaveTimer(): void`
- Produces: quiz opening always cancels any active shop countdown.

- [x] Add `clearShopAutoWaveTimer()` at the beginning of `openQuiz()`, before showing the modal.
- [x] Review the control flow to confirm no quiz-close path restarts the countdown and the modal remains responsible for blocking shop interaction.

### Task 2: Prioritize ranged enemy threats

**Files:**
- Modify: `game.js` (`selectWeaponTarget`)

**Interfaces:**
- Consumes: existing `(weapon, enemies, origin, excluded, hitTargets)` selector arguments.
- Produces: the same enemy object or `null`, selected by threat priority and then squared distance.

- [x] Extend the existing single-pass selector with a ranged-threat class for `Grammar Goblin` and `Punctuation Phantom`; rank boss/elite targets according to the existing `grammar_sniper`/`archivist_compass` rule, then ranged threats, then ordinary enemies. Apply priority boosts only to targets inside melee weapon reach.
- [x] Preserve dead/zero-HP, excluded, hit-target filtering and squared-distance comparison within each priority class.
- [x] Review callers that retarget projectiles, turrets, and player weapons to ensure the new common priority is appropriate for every selector caller.

### Task 3: Add shared speech synthesis and quiz pronunciation

**Files:**
- Modify: `game.js` (speech helper and `openQuiz`)
- Modify: `index.html` (quiz pronunciation control)

**Interfaces:**
- Produces: `speakGameText(text, { lang, role })` and `stopGameSpeech()`; unsupported API is a no-op.
- Speech roles: `narrator`, `character`, and `boss`; `boss` uses lower pitch and slower rate.

- [x] Add the shared helper that reads available voices, prefers a natural-sounding voice matching the requested language, falls back to the browser default, and safely handles unavailable synthesis.
- [x] Add an accessible pronunciation/replay button beside the quiz word and wire it to speak the current word with `en-US`.
- [x] Speak the word automatically when `openQuiz()` displays it; cancel previous speech before starting and cancel when the quiz flow ends.
- [x] Review voice-selection fallback behavior for both an empty voice list at startup and a later `voiceschanged` event.

### Task 4: Narrate chapters, story dialogue, and boss encounters

**Files:**
- Modify: `game.js` (`showChapterCard`, `renderStoryPanel`, `spawnMilestoneBoss` and boss phase transition)
- Modify: `index.html` (story narration replay control)

**Interfaces:**
- Consumes: `speakGameText(text, { lang, role })`, `stopGameSpeech()` from Task 3.
- Produces: automatic narration for chapter/story text, speaker-appropriate story delivery, and one voice line per boss encounter/phase event.

- [x] Speak the chapter narration in Turkish when a chapter card appears.
- [x] Speak each story panel’s active dialogue in Turkish, using the speaker identity to select character or boss delivery; stop the previous panel’s utterance before reading the next.
- [x] Add a story replay control that repeats the currently visible dialogue through a user gesture; preserve Tab and native Enter/Space activation while it is focused.
- [x] Add a small set of situation-specific boss entrance/enrage lines and speak once for an encounter/phase, using the deep boss profile; do not speak on each boss attack.
- [x] Stop speech when story UI closes, a new run begins, or the game-over screen takes focus; review all speech hooks for overlapping playback.

### Task 5: Review the complete change

**Files:**
- Review: `game.js`, `index.html`

- [x] Inspect the complete diff for scope, syntax, accessibility labels, and fallback paths without adding or running tests.
- [x] Confirm the three original requirements and every voice surface in the design spec have a corresponding implementation in the diff.
