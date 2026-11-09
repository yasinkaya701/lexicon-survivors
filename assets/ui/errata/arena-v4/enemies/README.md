# Arena v4 enemies

18 canonical identities,120 fresh painted animation frames, integrated through arena-v3/manifest.json. Common enemies and four larger archetypes have4 frames each; Vocabulary Void, Double Negative Drake, Spelling Spectre and Typo Splinter have16 each. Red Pen Inquisitor and Lexicon Dragon have4 frames each at256×256; other exports are128×128. All use lossless WebP with true alpha. Residual alpha of1/255 from Spectre/Drake export was normalized to0. The renderer lazily requests encountered species and holds frame0 under reduced motion.

Canonical high resolution boss turnarounds from the story-art-600 worktree provide identity; current upgrade_v1 sprites provide Goblin, Slime and Splinter identity. The new hero art provides rendering consistency. No health, hitbox, damage or attack timing is stored in the artwork.

- common-enemies-prompts.md: eight common enemies,32 frames; rejected cartoon attempt remains outside product assets.
- void-drake-spectre-splinter-prompts.md: four longer sequences,64 frames and preserved masters.
- titan-mimic-phantom-ogre-source.png:4×4 generated sheet, rows Syntax Titan/Malapropism Mimic/Palindrome Phantom/Oxymoron Ogre. Shared per-row crop and scale are in titan-mimic-phantom-ogre-export.json.
- inquisitor-dragon-source.png:2×4 generated sheet, rows Red Pen/Lexicon Dragon. Shared per-row crop and scale are in inquisitor-dragon-export.json.

Root sheets were generated with the built-in image tool: canonical references were supplied alongside the new Inky sprite for style. Prompts require complete transparent sprites, distinct sequential movement poses, shared row scale/baseline, readable painted volume and preserved canonical masks, armour, weapons, wings and materials; no baked UI, text, labels or environment. Final frames were inspected at source and gameplay scale before manifest activation.
