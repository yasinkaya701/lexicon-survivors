# Arena v4 common enemy source prompts

The two source sheets below were generated with the built-in image generator as transparent PNGs. Each requested an exact four-column, four-row sheet, with one enemy per row and four action poses across columns.

## Sheet 1

**Source references in order**

1. `assets/sprites/upgrade_v1/monster_grammar_goblin.png` — current small goblin sprite (book helmet, scroll shield).
2. `assets/sprites/upgrade_v1/monster_typo_slime.png` — current orange ink slime and quill sprite.
3. `story-art-600/docs/story-art-600/references/bosses/punctuation_phantom.png` — canonical high-resolution phantom sheet.
4. `story-art-600/docs/story-art-600/references/bosses/idiom_imp.png` — canonical high-resolution imp sheet.
5. `assets/ui/errata/arena-v3/rune_sorceress-sheet.png` — painterly finish reference only.

**Prompt**

> Use case: stylized-concept. Asset type: exact 4 columns × 4 rows top-down game enemy animation sheet, transparent background. Reference 1 is the CANONICAL Grammar Goblin: retain its small green goblin identity, green-brown colors, book-shaped helmet, scroll shield and compact stout body; render clearly as a scrappy little creature with those props in hand. Reference 2 is the CANONICAL Typo Slime: retain the warm orange ink puddle silhouette with its feather quill embedded/held, not a round purple face. Reference 3 is the CANONICAL Punctuation Phantom: retain a small ivory punctuation-mask face, layered charcoal/navy robes, elegant dangling golden punctuation charms, and a dark flowing ink-tail; clearly a floating ghost, never a cyan question-mark creature. Reference 4 is the CANONICAL Idiom Imp: preserve ember-red hooded body and horns, shredded warm-red robe, glowing ember lantern held in one hand, small rolled scroll bundle; do not turn it into a bare floating head. Reference 5 is ONLY the hand-painted style guide: match its painterly rendered volume, grounded brush texture, restrained edge highlights, confident contours and small readable silhouette; do not borrow the character or purple palette. Sheet layout: exactly 4 equal columns by 4 equal rows, no borders, grid lines or labels. One enemy per row in this order: Goblin, Slime, Punctuation Phantom, Idiom Imp. Each column is the next distinct frame in a 4-frame seamless idle-to-ready cycle; poses must have clear body-weight shifts and prop movement, not only blinking. Goblin alternates shield-forward and cautious steps, turns its book helmet slightly and lifts/lowers the scroll shield. Slime squashes low, stretches upward, leans forward and recoils; the quill visibly tilts with the ink body. Phantom's ink tail sweeps side to side and robe hem curls while the mask remains identifiable. Imp shifts its stance, swings the lantern and tail, and adjusts the scroll bundle. Keep all four frames of each identity consistent in size, facing and shared foot/hover baseline, with visible but modest pose changes. 3/4 top-down angle, readable around 96px on screen, full body and props well inside each cell with clean transparent space between cells. Premium painterly game sprite art, coherent palette across all four rows. No scene/background, no floor/shadow, no UI, no text, no letters, no numbers, no extra creatures, no beams, no magical particle clouds, no giant effects.

Generated PNG master: `/Users/yasinkaya/.codex/generated_images/01a1bbe7-a3de-7b33-8e0d-ebca501e9c52/exec-33016546-47da-4207-b076-537bd35df830.png` (1244×1264 RGBA).

## Sheet 2

**Source references in order**

1. `story-art-600/docs/story-art-600/references/bosses/homophone_harpy.png` — canonical high-resolution harpy sheet.
2. `story-art-600/docs/story-art-600/references/bosses/tautology_twin.png` — canonical high-resolution paired twin sheet.
3. `story-art-600/docs/story-art-600/references/bosses/dangling_modifier.png` — canonical high-resolution hanging mask/ribbon sheet.
4. `story-art-600/docs/story-art-600/references/bosses/run_on_reaper.png` — canonical high-resolution reaper sheet.
5. `assets/ui/errata/arena-v3/rune_sorceress-sheet.png` — painterly finish reference only.

**Prompt**

> Use case: stylized-concept. Asset type: exact 4 columns × 4 rows transparent game enemy animation sheet. Reference images 1–4 are the canonical identity sheets; reference 5 is ONLY the approved painterly sprite finish guide. Match the hand-painted dimensionality, brush texture, strong contour, grounded material highlights and sprite scale of reference 5, never its violet character/palette. Each of four rows has one identity and four deliberately different 3/4 top-down idle/ready poses, not copied/blink-only poses. Layout rows: (1) Homophone Harpy: match the reference's powerful ivory feathered wings, dark auburn crest, pale bird-mask face, red-brown feather mantle and small bronze fittings. (2) Tautology Twin: ALWAYS a pair of duplicated female forms joined shoulder-to-shoulder; preserve distinct teal and antique bronze outfits/hair, repeating mirror motif and visible paired silhouette in every frame. (3) Dangling Modifier: preserve its eerie hanging anatomy, one ivory eye/mask set into a red-burgundy hanging book-like body, long teal/burgundy ribbons, little dangling hooks and threadlike limbs. (4) Run-on Reaper: ivory shredded layered shroud, dark recessed face with tiny restrained red eyes, long dark scythe with subtle crimson inner edge; do not use purple robes or bright magenta scythe. Across four columns pose changes must be obvious at small display: harpy cycles folded wings, half-spread glide, fully open banking wings, then wing tuck; twin pair shifts in counterpose with changed arm/robe positions while remaining joined; modifier hangs angled left, swings right with ribbons trailing, descends with cover/eye visible, then returns; reaper glides, sweeps scythe low, turns its shroud and raises scythe, then settles. Maintain consistent identity, comparable body scale, facing and shared baseline within each row. Exact 4×4 even sheet grid, one complete enemy centered in each cell, transparent gutters, safe margins, no overlap, no labels/dividers/background/floor/shadow. Paint strong distinct full silhouettes and recognizable props. No UI, words, letters, numbers, random runes, extra characters, explosion/glow/particle effects or clutter.

Generated PNG master: `/Users/yasinkaya/.codex/generated_images/01a1bbe7-a3de-7b33-8e0d-ebca501e9c52/exec-8a93be48-af13-4339-979f-9fcd84dae09d.png` (1261×1247 RGBA).

## Extraction notes

The exports are 128×128 lossless WebP. Row placement was read from source-sheet content bounds, since generated poses slightly overlap nominal equal-row crop lines. Each frame was isolated from its cell’s connected alpha components; a common scale and foot/hover anchor were used for all four poses of each enemy. No per-frame auto-trim or rescaling was applied. Only tiny detached generation specks were excluded. The first rejected attempt is preserved outside the repo at `/tmp/lexicon-enemies-rejected-v1/` and is not used by this version.
