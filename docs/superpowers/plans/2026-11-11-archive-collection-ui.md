# Archive Collection UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain word/bestiary lists and leaderboard rows with a varied illustrated card collection.

**Architecture:** Keep the existing data and interaction logic in `interface.js` and `game.js`; add focused archive CSS and two optimized sprite atlases. The current leaderboard API and score submission remain unchanged.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, WebP sprite atlases, GitHub Pages.

**Spec:** `docs/design/collection-card-ui.md`

## Global Constraints

- Preserve the codex search, word-level filters, bestiary catalog data, and leaderboard API behavior.
- Match the title/character selection palette; avoid yellow paper panels and decorative ribbon buttons.
- Keep all score text and vocabulary as accessible HTML text.
- Do not change combat, spawn counts, or render-quality settings.
- Support touch layouts and reduced-motion preferences.

## Review Focus

- CSS sprite positions map the intended artwork to each entry.
- Empty, loading, API-failure, and local-fallback leaderboard states remain legible.
- Search/filter changes keep the selected tab and word level.
- Small-screen dialogs scroll without clipping controls or card text.

## Tasks

- [x] **1. Register archive artwork and page styles.** Added the generated atlases, focused CSS, and versioned URLs. Verified both atlases render in the local browser.
- [x] **2. Render collection cards.** Updated `interface.js` for word, weapon, and all 18 bestiary entries. Verified all entries, word filters, search, and the 390px layout.
- [x] **3. Upgrade leaderboard presentation.** Replaced inline layout styles and added the podium/ranked cards. Verified 3 podium cards, 17 remaining rows, form presence, and mobile fit; the public API returned HTTP 200.
- [ ] **4. Verify and publish.** Load both dialogs on desktop and mobile sizes, inspect image requests and console errors, confirm global leaderboard fetch from the deployed origin, update cache/integrity metadata, and publish the tested files.
