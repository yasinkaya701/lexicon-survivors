# Remaining request closure

The user asks to finish any omitted prior request and publish. BASE cf5dc4f.

## Global constraints
Preserve all six canonical identities, story, economy, movement, hitboxes, cooldowns and rewards. Latest intentional boss balance is5×HP and3×damage. Keep current cover, shop and guide. Use existing generated art; no new asset generation or broad refactoring. No subagents inside worker. Parent owns release stamping, commit and deployment.

## Task 1: Use current hero art in every visible actor representation

Root cause and reproduction are in /tmp/lexicon-remaining-arena-audit.md. Main hero uses the new arena-v3 painted frames, while HUD and Palimpsest Step decoys still select the legacy cData.sprite.

Own only game.js, index.html, assets/ui/errata/hud.css and test/hero-art-consistency.cjs. Other agents are read-only.

- HUD must use the existing selected character's canonical selection portrait at assets/ui/errata/portraits/{selected_char}-selection.webp, including lexicon_alchemist and shadow_lexicographer. Match initial index.html Inky src too. Retain current footprint and accessible name; use smooth portrait rendering with a restrained existing-tone frame, no layout expansion.
- The Palimpsest Step translucent decoy must use the same current painted hero family as the real actor. Reuse the existing ErrataMotion cache/frame API. Preserve decoy coordinates, timer, hp, targeting and all gameplay state. Keep its existing visual footprint unless there is a concrete alignment defect. Correctly map canonical gameplay IDs to alchemist/shadow_scribe animation keys. If the new texture is genuinely unavailable, retain the current legacy fallback; normal loaded gameplay must draw new art. Respect existing reduced-motion behavior and opacity.
- Write a meaningful browser regression first and observe its expected failure for old HUD/decoy sources. Exercise all six IDs; spy on actual canvas drawImage to establish the decoy uses the current image (not just helper return), and confirm render doesn't mutate player/decoy/combat data. Avoid production test-only code. Verify HUD unchanged-update mutation budget stays0.
- Run new regression, existing hud-performance.cjs and v3-visuals.cjs, node --check, git diff --check. Save a representative screenshot and inspect it. Report exact red/green evidence, files and limitations in /tmp/lexicon-closure-task-1-report.md. Do not commit or deploy; parent reviews and publishes immediately.

## Completed closure

HUD/decoy/guide stale art fixed; all six source regressions pass. Settings clipping is fixed and verified at four normal/large-text sizes. Latest user combat, difficulty, TTS and masculine ninja additions are implemented under the combat-refinement plan. Original immutable gameplay contracts remain except expressly authorized difficulty pressure and boss buff.
