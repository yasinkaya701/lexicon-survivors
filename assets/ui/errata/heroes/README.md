# Canonical 128px hero frame extracts

These lossless WebP textures are derived directly from the six approved combat animation sheets at `output/imagegen/characters/source/*_combat_animation_sheet.png` (source dimensions 1448×1086 RGBA), each a 4-column × 3-row grid of 362×362 cells. For each character, the alpha>80 silhouette bounds were unioned across all 12 source cells, then expanded to a centered square crop with 6 source-pixel padding. That same crop is applied to every frame for the character before Lanczos resampling to 128×128. Per-character cropping preserves aspect ratio, animation registration, source alpha, and baked-in props while removing excess transparent cell margins.

## Filenames and mapping

`{character}_{action}_{frame}.webp`; all are 128×128 RGBA.

- Character keys: `inky`, `quillmaster`, `word_knight`, `rune_sorceress`, `alchemist`, `shadow_scribe`.
- `idle_0..3`: source row 0, columns 0..3.
- `run_0..7`: source row 1, columns 0,0,1,1,2,2,3,3.
- `ranged_0..3` and `attack_0..3`: both use source row 2, columns 0..3.

## Visual notes

- Weapon/props are baked into each complete hero frame: Quillmaster carries his firearm in the source art; Alchemist retains the canonical vial as a character prop. The separate runtime Alchemist flamethrower remains external.
- Quillmaster attack frame 0 aims left in the source; frames 1–3 aim right.
- The new per-character crop increases visible hero scale without modifying the renderer or collision hitboxes. Word Knight’s full silhouette includes its blade and remains relatively smaller to preserve the complete prop.
- Runtime paths are `ui/errata/heroes/{character}_{action}_{frame}.webp` relative to the app asset root.

## Shared crop bounds (source-cell coordinates)

Bounds are half-open `(left, top, right, bottom)` in each 362×362 cell. The crop is a centered square with 6px padding beyond the larger union dimension; crops may extend beyond the cell and are padded transparent by the image library.

| Hero | Alpha>80 union | Shared square crop | Side |
| --- | --- | --- | ---: |
| Inky | `(40, 18, 329, 311)` | `(32, 12, 337, 317)` | 305 |
| Quillmaster | `(41, 29, 333, 320)` | `(35, 22, 339, 326)` | 304 |
| Word Knight | `(15, 23, 342, 304)` | `(9, -6, 348, 333)` | 339 |
| Rune Sorceress | `(63, 30, 354, 328)` | `(54, 24, 364, 334)` | 310 |
| Alchemist | `(11, 7, 346, 315)` | `(5, -12, 352, 335)` | 347 |
| Shadow Scribe | `(38, 56, 346, 329)` | `(32, 32, 352, 352)` | 320 |
