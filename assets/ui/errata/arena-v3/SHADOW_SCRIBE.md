# Arena v3 Shadow Scribe sprite extraction

Generated source: `shadow_scribe-sheet.png` (unchanged 1261×1247 RGBA master), derived from the canonical Shadow Scribe animation sheet and character portrait, matching the approved Rune Sorceress/Alchemist v3 painterly style.

4×4 cell boundaries: X `[0, 315, 630, 946, 1261]`, Y `[0, 312, 624, 935, 1247]`. Each frame was alpha-trimmed at threshold 4 with 4 px padding, resized proportionally using a shared scale (0.40288), then placed on a 128×128 transparent canvas at center x and foot baseline y=118. The hood, face, burgundy sash/cape, brass buckle, boots and hand-held ivory blade stay visible.

Mapping: row 0 → `idle_0..3`; rows 1 and 2, left-to-right → `run_0..7` (distinct strides); row 3 → `attack_0..3`. The blade remains physically gripped through all actions.

| Frame | Source crop | Output art | Bytes |
|---|---:|---:|---:|
| `idle_0` | 227×268 | 91×108 | 12040 |
| `idle_1` | 223×266 | 90×107 | 12004 |
| `idle_2` | 217×268 | 87×108 | 11610 |
| `idle_3` | 207×268 | 83×108 | 11604 |
| `run_0` | 203×240 | 82×97 | 10940 |
| `run_1` | 214×238 | 86×96 | 10672 |
| `run_2` | 224×242 | 90×97 | 10824 |
| `run_3` | 217×248 | 87×100 | 10926 |
| `run_4` | 223×259 | 90×104 | 11152 |
| `run_5` | 212×237 | 85×95 | 10666 |
| `run_6` | 213×260 | 86×105 | 11242 |
| `run_7` | 217×246 | 87×99 | 11070 |
| `attack_0` | 211×238 | 85×96 | 11850 |
| `attack_1` | 232×260 | 93×105 | 12774 |
| `attack_2` | 278×261 | 112×105 | 13714 |
| `attack_3` | 222×252 | 89×102 | 12754 |
