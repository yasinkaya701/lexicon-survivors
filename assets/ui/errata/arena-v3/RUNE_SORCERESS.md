# Arena v3 Rune Sorceress sprite extraction

Generated source: `/Users/yasinkaya/.codex/generated_images/01a1bbe7-a3de-7b33-8e0d-ebca501e9c52/exec-86137cd8-2201-41c9-9252-b5c88f31c494.png` (1261×1247 RGBA). The unchanged master copy is `rune_sorceress-sheet.png`.

Measured transparent-cell boundaries used for the 4×4 source grid:

- X: `[0, 329, 653, 977, 1261]`
- Y: `{yb}`

Per-cell alpha bounds were trimmed with 4 px padding, then resized with one shared scale (0.37966; max source crop side 295px), preserving alpha and aspect ratio. Every output is 128×128 RGBA WebP with the same x-center and foot baseline y=118. The input artwork places the magical orb close to the hero, with all attack effects kept inside their source cells.

Mapping: row 0 → `idle_0..3`; rows 1 and 2, left-to-right → `run_0..7`; row 3 → `attack_0..3`. Runtime can reuse attack frames for ranged poses as requested.

| Frame | Source crop | Output art | Bytes |
|---|---:|---:|---:|
| `idle_0` | 184×289 | 70×110 | 13620 |
| `idle_1` | 184×288 | 70×109 | 13474 |
| `idle_2` | 184×285 | 70×108 | 13526 |
| `idle_3` | 182×285 | 69×108 | 13512 |
| `run_0` | 227×270 | 86×103 | 14336 |
| `run_1` | 217×259 | 82×98 | 12976 |
| `run_2` | 226×270 | 86×103 | 13890 |
| `run_3` | 226×265 | 86×101 | 13528 |
| `run_4` | 218×269 | 83×102 | 13416 |
| `run_5` | 218×263 | 83×100 | 12748 |
| `run_6` | 218×269 | 83×102 | 13164 |
| `run_7` | 213×273 | 81×104 | 12834 |
| `attack_0` | 200×291 | 76×110 | 14450 |
| `attack_1` | 257×292 | 98×111 | 16718 |
| `attack_2` | 295×288 | 112×109 | 16802 |
| `attack_3` | 183×289 | 69×110 | 13782 |
