# The Last Errata Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development with scoped Luna tasks. Keep unrelated dirty work intact.

**Goal:** Apply the supplied design pack to the actual published web client, preserving mechanics, canonical characters, enemies and narrative.
**Architecture:** Existing canvas/game state remains authoritative. Replace the accumulated inline CSS with separate, maintainable editorial UI styles. Add an accessible menu controller in a separate classic script which reads runtime catalogs; retain every existing game hook.
**Tech Stack:** Vanilla HTML/CSS/JavaScript, existing local IBM Plex, Canvas 2D; Playwright browser verification.
**Spec:** /Users/yasinkaya/Downloads/lexicon_survivors_design_pack_v2/DESIGN.md and screens/*/DESIGN.md.

## Global Constraints
- Six canonical character identities and story data preserved. Later user requests explicitly authorize fresh character/enemy art, Brotato sockets and bosses with5×HP/3×damage. Other combat rules, prices and CEFR remain unchanged.
- Real DOM text and buttons; no baked UI images, invented statistics or routes.
- Paper #F2E1C5, ink #110D10, wine #7C202D, editor red #B63A3E, teal #49766E.
- Interactive targets >=44px; readable text >=12px; focus visible; reduced motion; safe areas.
- Validate 1280×720, 1024×576, 844×390, 390×844 and 200% text.
- Deployment to the existing GitHub Pages site was explicitly authorized on2026-11-09. Existing gameplay/voice dirty diff is preserved; baseline copied to /tmp/lexicon-errata-baseline.

## Review Focus
- Back/forward through preparation preserves character, level and difficulty.
- All six characters remain reachable at narrow dimensions.
- Modal keyboard focus, Escape, resume and quiz state remain correct.
- Shop purchases/countdown keep existing state and calculations.
- Decorative art never blocks gameplay or intercepts touch.

### Task 1: Fresh visual foundation and title flow (controller)
- [x] Replace old inline style cascade with assets/ui/errata/theme.css; preserve font-face declarations and all IDs.
- [x] Add separate landing menu, character/preparation steps, genuine DOM labels and canonical sprite presentation.
- [x] New menu art without text; compressed local WebP. Keep sprites unchanged.
- [x] Browser check menu→character→preparation→play and back, mobile layout screenshots.

### Task 2: Shop, quiz and utility surface styles (Luna)
- [x] Own only assets/ui/errata/surfaces.css. Style existing shop, quiz, inventory, mistakes, story, chapter, leaderboard and result selectors using theme tokens and runtime content. No JS/HTML edits.
- [x] CSS has standalone responsive definitions; no hidden functionality; all interactive text >=12px and targets >=44px. Existing IDs retained.
- [x] Parent verifies screenshots and all six shop categories + quiz outcome.

### Task 3: Menu/accessibility controller (Luna)
- [x] Own only assets/ui/errata/interface.js and test/interface.spec.cjs. Add landing/character/preparation navigation, runtime codex/bestiary, settings and guide via new overlays; actual game-state pause/resume; modal focus containment/restoration. All labels Turkish.
- [x] Interface contract supplied in dispatch; runtime catalogs are source of truth. Local settings saved defensively.
- [x] Behavioral tests first, then browser verification, no changes to combat or game.js.

### Task 4: Integration, low-risk performance and verification (controller + Luna review)
- [x] Review diffs and confirm original gameplay diff survived; no sprite or data modification.
- [x] Run supplied web-game client plus browser integration across menu, gameplay, shops, quiz, story, utility overlays, results.
- [x] Test responsive bounds, keyboard, reduced motion, text enlargement; inspect screenshots and errors. Measure frame/DOM cost; optimize only proven UI hot paths.
- [x] Independent Luna code/spec review; fix actionable findings; record evidence in progress.md.

### Task 5: User-requested arena and hero presentation extension
- [x] Audit canonical hero animation masters, source resolution and exact heldweapon/muzzle alignment.
- [x] Integrate four new topdown world illustrations with existing world dimensions/collisionbounds.
- [x] Improve arena hero image clarity and heldweapon pose while preserving timing, attacklogic and hitboxes.
- [x] Improve story pacing/presentation with existing canon art/text; no arbitrary storyrewrite.
- [x] Browser verify all6characters in movement/attack and fourbiomes, bosses, reducedmotion/loweffects and performance. Re-run UIbehavior/layout/HUD checks; fix844landscapeclippeddossier.

## Completion status — 2026-11-09

Implementation and local browser verification are complete for the reviewed UI, gameplay presentation, manual inventory merging, and current art integration. See `progress.md` and `/tmp/lexicon-release-ui-review.md` for current evidence and the source-preserving changes to aim-helper behavior. The old byte-identical function-block comparison is superseded by deterministic combat comparisons that exclude the intentional socket-position change. The deployment audit confirms the public GitHub Pages URL and `gh-pages` root source; publication is still pending and no commit/push/deploy has been made.

## Final user additions — 2026-11-09

All18 enemy types now use120 newly painted frames; the rejected cartoon set was replaced before activation. Bosses have5×HP and3×damage per the latest correction. Normal startup avoids6.1MB of legacy room PNGs, fonts use full-glyph WOFF2, and loading/fallback tests pass. The v6 mysterious cover is integrated and the game was opened in a visible retained browser tab. User asked to proceed immediately to deployment; commit/push/build verification follow the passing local suite.
