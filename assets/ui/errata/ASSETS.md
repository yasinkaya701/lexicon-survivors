# Last Errata art manifest

All labels, prices, questions, choices, statistics and dialogue remain live HTML. Artwork supplies material and illustration, never interactive text.

## Art direction

Printed fantasy archive: charcoal/burgundy environments, restrained aged brass, cool ivory paper and deep teal architectural accents. The six canonical identities and their clothing/props remain the reference. No neon circles, floating generic panels or heavy ornamental overlays over reading areas. Existing story scenes, enemy sprites, item sprites and original source masters remain intact.

## New UI artwork

- `title-scene-v2.webp`: library approach, canonical Inky at left and masked antagonist at right; quiet center for navigation.
- `logo-dark.webp`, `logo-light.webp`: transparent Lexicon Survivors wordmark for contrasting surfaces.
- `archive-book-v2.webp`: cool ivory open folio used for preparation and archive overlays.
- `dossier-paper.webp`, `menu-button.webp`: tactile paper silhouettes with restrained editorial edges.
- `portraits/*-selection.webp`: six 720×900 selection busts, generated against the canonical story model sheets. The wardrobe, face, silhouette and characteristic prop are preserved. Each is below180KB.
- `scriptorium-desk.webp`: continuous merchant writing desk behind a clear catalog, without baked headings/buttons.
- `quiz-leaf.webp`, `quiz-seal.webp`, `shop-word-emblem.webp`: examination folio, wax seal and word-leaf emblem.
- `weapon-plates.webp`: WebP conversion of the original `assets/sprites/weapons/weapon_atlas_4x4_source.png`; catalog coordinates follow the existing fifteen weapon IDs.
- `voice.svg`: local vector speaker glyph used consistently in quiz/story controls.

## Arena artwork

`world/` contains four top-down room illustrations for the original 25-wave biome bands. Each uses the existing2800×2100 world rectangle; terrain and collision logic remain authoritative. Quiet floor centers keep enemies, pickups and attacks readable. `world.js` loads room art on demand and retains the legacy room as a fallback.

`heroes/` contains higher-resolution transparent frames extracted from the existing six canonical combat master sheets in the main checkout's `output/imagegen/characters/source/`. See its extraction notes for row/phase mapping. Old sprites remain available as fallback; screen footprint and hitboxes are unchanged.

## Source and production notes

Canonical story model sheets: sibling worktree `story-art-600/docs/story-art-600/references/`. Original generated image masters remain in the Codex generated-images store; compressed project-bound deliverables are local here. `title-library.webp` and `archive-book.webp` are earlier retained variants; the v2 images are used by the current UI. `portraits/{id}.webp` are retained source-sheet conversions, while `*-selection.webp` are the final selection images.

## Latest additions

- `structures/{ink-well,resonance-bell,astral-astrolabe}.webp`: three transparent512px painted archive structures, below26KB each. world.js crops the outer alpha margin when drawing and registers each stone foot to the true interaction point.
- `results/{victory-archive,defeat-archive}.webp`: restrained archive backdrops below80KB, combined with the selected canonical portrait and live story/outcome text.
- `icons/{vitality,ink,kills,notebook,inventory,pause}.svg`: engraved local HUD medallions extending the existing semantic vector glyphs.
- `hud.js`/`hud.css`: code-native chapter path and instrument readouts, tied to the actual wave count. The route is not a baked progress image.

## Arena v3 and validation

- `arena-v3/` contains 128×128 transparent combat frames for the upgraded canonical heroes and eleven source-faithful enemy extracts. Hero/enemy source mappings and extraction notes are stored beside the assets. Existing runtime sprites remain available as fallback. Enemy source extracts improve sampling clarity only; they do not redraw or redesign the original monsters.
- UI and arena checks listed in `progress.md` were run against the current worktree. Publication remains a separate, pending release step.

- `arena-v4/enemies/` adds polished 128×128 transparent four-frame idle loops for eight canonical common enemies. The frames preserve their existing identity palettes and signature silhouettes; see the adjacent README for sheet row mapping and extraction details. These files are prepared for parent-owned runtime integration; existing runtime assets are unchanged.

## Final release — 2026-11-09

Active cover is title-scene-v6.webp (1600×900,124KB), with partial canonical bosses and story clues; earlier title candidates remain unused. All six heroes use96 painted frames through arena-v3/manifest.json. Arena-v4/enemies contains120 new frames for18 species, including256px principal bosses; bestiary uses the same identities. See the enemy README and prompt files for generation references. New full-glyph WOFF2 fonts total412,508bytes versus1,137,124bytes for their TTF equivalents. Runtime CSS/JS queries are content hashed by scripts/prepare-release.py.
