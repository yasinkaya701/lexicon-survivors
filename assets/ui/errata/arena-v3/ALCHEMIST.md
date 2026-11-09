# Arena v3 Alchemist sprite extraction

Generated source: `alchemist-sheet.png` (unchanged 1261×1247 RGBA master), derived from the canonical Alchemist turnarounds and the approved Rune Sorceress v3 style sheet.

Measured 4×4 cell boundaries: X `[0, 315, 630, 946, 1261]`, Y `[0, 312, 624, 935, 1247]`. Each frame was alpha-trimmed at threshold 4 with 4 px padding, resized proportionally with a shared scale (0.38621), and placed on a 128×128 transparent canvas at center x and foot baseline y=118. All canonical costume details and both belt vials remain visible. The carried teal vial is held in the hand through idle and movement; attack frames animate its release without adding a drawn projectile.

Mapping: row 0 → `idle_0..3`; rows 1 and 2, left-to-right → `run_0..7` (distinct strides); row 3 → `attack_0..3`.

| Frame | Source crop | Output art | Bytes |
|---|---:|---:|---:|
| `idle_0` | 178×290 | 69×112 | 13542 |
| `idle_1` | 179×287 | 69×111 | 13566 |
| `idle_2` | 187×287 | 72×111 | 13656 |
| `idle_3` | 183×286 | 71×110 | 13520 |
| `run_0` | 224×271 | 87×105 | 14684 |
| `run_1` | 217×255 | 84×98 | 12700 |
| `run_2` | 211×270 | 81×104 | 12638 |
| `run_3` | 231×267 | 89×103 | 13340 |
| `run_4` | 227×281 | 88×109 | 14102 |
| `run_5` | 216×269 | 83×104 | 13012 |
| `run_6` | 207×274 | 80×106 | 13152 |
| `run_7` | 219×273 | 85×105 | 13420 |
| `attack_0` | 206×283 | 80×109 | 14614 |
| `attack_1` | 223×284 | 86×110 | 15058 |
| `attack_2` | 248×284 | 96×110 | 15350 |
| `attack_3` | 215×283 | 83×109 | 14410 |
