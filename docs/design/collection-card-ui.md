# Archive Collection UI

## Goal

Replace the plain word and monster lists and the text-only leaderboard rows with a cohesive, illustrated collection-card system for the web game.

## Approved direction

Use the existing title and character dossier language: ink-dark surfaces, cream type, restrained wine/red accents, slim brass rules, and varied portrait art. The player chose collectible cards and asked for many consistent but distinct assets, then steered the first pass away from yellow paper and ornamental buttons.

## Surfaces

- **Word book:** retain category tabs, A1–C2 filters, search, and real word definitions/examples. Show illustrated dark dossier cards with a clear level badge and a separate readable definition/example area.
- **Bestiary:** keep all economy-backed entries and search. Give each enemy a distinct atlas portrait (using existing art for the two entries outside the generated atlas), threat/reward metadata, and a short description.
- **Global leaderboard:** retain the existing API, alias submission, and difficulty filter. Present the top three as a podium and remaining scores as ranked cards on dark surfaces; keep local-device fallback/status clear.

## Assets

- Generated bestiary atlas: 16 distinct, transparent miniature portraits in a 4×4 sprite sheet.
- Generated archive emblem atlas: 16 transparent archive objects used to vary word cards and rank markers.
- Use the existing V4 bestiary art for Typo Splinter and Lexicon Dragon Boss.
- Ship atlases as optimized WebP; keep labels, definitions, and scores as live HTML text.

## Constraints

- Preserve current search, level filters, API calls, score submission, and keyboard behavior.
- Keep the UI responsive and readable on narrow touch screens.
- Match the title/character selection palette; avoid yellow paper panels and decorative ribbon buttons.
- Do not alter enemy counts, combat, visual quality settings, or leaderboard backend behavior.
- Use CSS sprite positioning so the atlas remains two network assets rather than dozens of separate requests.
