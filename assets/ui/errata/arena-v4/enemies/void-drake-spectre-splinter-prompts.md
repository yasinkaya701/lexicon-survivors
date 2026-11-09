# Arena v4 enemy sprite generation prompts

All four sprite sheets were generated with the built-in image generator on transparent backgrounds. The approved Inky sheet was supplied strictly as a rendering-style reference. Each sheet is a 4×4 set of distinct ordered poses, exported by uniformly resizing each cell to 128×128 RGBA. The prompt and source inputs for each approved output are recorded below.

## Vocabulary Void

Prompt:

> Create a clean transparent-background sprite sheet for a 2D action game, exactly 4 columns by 4 rows, 16 distinct ordered hover / glide animation poses of the SAME enemy character, no grid lines or cell borders. Identity reference: canonical Vocabulary Void character sheet provided. Keep its exact identity: floating masked archive spirit, deep violet layered robe, pale bone mask, paper/feather mantle, long tapered robe. Style reference only: approved Inky arena-v3 sprite sheet, for painterly volumetric rendering, crisp dark contour, restrained cool ivory/burgundy/navy palette, refined hand-painted game art. Each cell one complete character, 3/4 top-down view facing right, consistent apparent size, centered with same baseline/registration; vary robe sway, mantle, arm angle and body bob subtly across 16 poses. Four rows are continuous different glide cycles with distinct silhouettes and believable motion. Keep all character parts inside cells; transparent empty background. Clean alpha edges. No ground shadow, floor, scenery, effects, text, letters, labels, UI, weapons not in canon, no duplicated bodies, no extra characters.

Inputs passed:

- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/story-art-600/docs/story-art-600/references/bosses/vocabulary_void.png`
- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/pages-boss-zoom-20261108/assets/ui/errata/arena-v3/inky-sheet.png`

## Double Negative Drake

The initial generation was rejected after review because it did not preserve the canonical paired-dragon identity. The approved regeneration used an isolated crop of the canonical reference showing the two dragons together.

Prompt:

> Create a 4 by 4 transparent game enemy sprite sheet: every one of the 16 cells must show the SAME joined Double Negative Drake, which is the PAIR OF TWO SMALL DRAGONS shown in the reference image: one dark forest-green dragon and one ivory-white dragon, flying together as one enemy, with distinct heads, wings and tails. Preserve their two-color paired identity. This is not a blue ghost and not a single dragon. Use a 3/4 top-down view facing right, professional matte painterly volume and crisp dark edges like the approved Inky arena sprite sheet. Exactly 16 clearly different ordered hovering/walking poses: wingbeats and paired dragon banking, consistent character scale and shared baseline/registration. Each cell contains both dragons attached as a paired enemy, no duplicates within each cell. Transparent background. No sheet-layout panels, no concepts/insets, no environment, shadows, text, effects, UI, labels, glyphs, gridlines or borders.

Inputs passed:

- `/tmp/double_negative_drake-isolated.jpg` (crop made from `docs/story-art-600/references/bosses/double_negative_drake.png`, source crop `(0, 0, 520, 660)`)
- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/pages-boss-zoom-20261108/assets/ui/errata/arena-v3/inky-sheet.png`

## Spelling Spectre

The initial generation was rejected after review because it interpreted other designs from the canonical reference sheet as separate rows. The approved regeneration used an isolated crop of the canonical front-facing spectre.

Prompt:

> Make one transparent 4-column x 4-row enemy animation sprite sheet. Every cell must be the SAME single Spelling Spectre, based on the isolated reference image: one floating pale blue-white parchment ghost with a deep red wax seal for its head/face and its own red ribbon border. Keep the iconic wax seal centered clearly on the head and the ragged ivory/blue shroud below. Do not include any other design from the original reference sheet. Match the approved Inky sprite's painterly game volume, dark controlled contour, matte materials and readability. 16 ordered unique hovering/gliding motion poses, each complete spectre centered at the same scale and registration with only slight body bob and sheet/ribbon sway. Transparent empty background. No other characters, no alternate rows of creatures, no model sheet insets, no scene, no magic effects, no shadows, no text, letters, symbols, grid lines, UI or borders.

Inputs passed:

- `/tmp/spelling_spectre-isolated.jpg` (crop made from `docs/story-art-600/references/bosses/spelling_spectre.png`, source crop `(0, 0, 510, 550)`)
- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/pages-boss-zoom-20261108/assets/ui/errata/arena-v3/inky-sheet.png`

## Typo Splinter

Prompt:

> Create a transparent 4 columns x 4 rows sprite sheet containing 16 distinct ordered skitter / hop poses of one Typo Splinter enemy. Use the supplied current upgrade_v1 monster_typo_splinter icon as strict identity reference: a small sharp splinter-like ink creature, dark charcoal/navy body with a striking crimson-red slash/spine and pale ivory broken-paper edge. Preserve this recognizable compact shard silhouette and red correction-mark accent; do not invent a different monster or make a cute blob. Match the approved Inky arena-v3 sprite sheet rendering style only: painterly volume, controlled dark contour, matte ink and paper, clear readable color shapes, professional game sprite not pixel art. 3/4 top-down facing right, about one half to two thirds of cell height to retain scale as a small enemy, centered consistently with fixed baseline and registration across every cell. Each frame is a unique connected animation pose: bob, twist, spring, recoil, with coherent shape, no extra loose shards or impact effects. Transparent empty background, no cast shadow, floor, scenery, grid lines, borders, labels, text, lettering, UI or additional characters.

Inputs passed:

- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/pages-boss-zoom-20261108/assets/sprites/upgrade_v1/monster_typo_splinter.png`
- `/Users/yasinkaya/Documents/ChatGPT/oyun/lexicon-survivors/.worktrees/pages-boss-zoom-20261108/assets/ui/errata/arena-v3/inky-sheet.png`
