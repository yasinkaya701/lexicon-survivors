# Canonical enemy source-preserving extracts

Each 128×128 transparent WebP is derived from the unmodified high-resolution source PNG at `output/imagegen/monsters/source/`. Alpha bounds above 4/255 were cropped with 4 px padding, resized proportionally to a 120 px maximum side using Lanczos, then placed on a transparent 128 px canvas. Grounded monsters share a bottom baseline at y=124; floating spectral/splinter enemies are vertically centered. Source PNGs and original runtime sprites remain unchanged.

| Enemy | Source image | Source dimensions | Alpha bounds | Crop | Output bytes |
|---|---|---:|---|---:|---:|
| `dangling_modifier` | `dangling_modifier.png` | 1292×1218 | (101, 83, 1193, 1145) | 1100×1070 | 21544 |
| `double_negative_drake` | `double_negative_drake.png` | 1254×1254 | (116, 146, 1099, 1101) | 991×963 | 25800 |
| `grammar_goblin` | `grammar_goblin.png` | 1254×1254 | (133, 199, 1123, 1118) | 998×927 | 15442 |
| `homophone_harpy` | `homophone_harpy.png` | 1254×1254 | (9, 175, 1238, 1076) | 1237×909 | 18044 |
| `idiom_imp` | `idiom_imp.png` | 1254×1254 | (15, 189, 1225, 1076) | 1218×895 | 15692 |
| `punctuation_phantom` | `punctuation_phantom.png` | 1254×1254 | (242, 128, 1020, 1135) | 786×1015 | 11866 |
| `run_on_reaper` | `run_on_reaper.png` | 1254×1254 | (69, 105, 1150, 1178) | 1089×1081 | 18080 |
| `spelling_spectre` | `spelling_spectre.png` | 1254×1254 | (160, 140, 1095, 1157) | 943×1025 | 14230 |
| `tautology_twin` | `tautology_twin.png` | 1254×1254 | (166, 147, 1085, 1110) | 927×971 | 23076 |
| `typo_slime` | `typo_slime.png` | 1254×1254 | (231, 298, 1010, 1015) | 787×725 | 15564 |
| `typo_splinter` | `typo_splinter.png` | 1254×1254 | (220, 18, 991, 1241) | 779×1231 | 13376 |
