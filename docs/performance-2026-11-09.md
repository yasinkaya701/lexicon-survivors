# Lexicon Survivors performance upgrade

## Change

`game.js` no longer downloads the four legacy full-arena fallback PNGs during every startup. The selected current room is requested by `world.js` while the title screen is visible; the legacy room PNG is requested only after that room image has failed. If the new room loads normally, the canvas draws it as before. The old image remains available as a fallback, and arena bounds, collisions, enemy updates, and attack logic are unchanged.

`motion.js` now supports lazily requested four-frame enemy art through `{ frames, fps }` manifest entries. It keeps legacy string entries working, requests only the species currently rendered, cycles at the declared rate, and uses frame 0 when reduced motion is enabled. `game.js` passes a stable per-enemy phase into the renderer. Four boss sprite aliases normalize to their canonical enemy art. This changes rendering only.

## Measurements

Cold Playwright startup before the optimization: 250 resources / 13.49 MB transferred / 224 image requests. The four eager legacy room PNGs were 6,123,167 bytes total. Current shared worktree after the optimization and the root's concurrent font and title-art changes: 250 resources / 7.00 MB / 224 image requests. It requests the 219 KB `library.webp` during startup and no `arena_frame_*.png` files. Accounting for the root's separate 724,616-byte font reduction, ~124 KB title-cover addition, and the new 219 KB room preload, this optimization removes approximately 5.9 MB from the earlier startup transfer.

A 300-frame first-wave Playwright sample measured 16.61 ms average rAF interval, 17.0 ms p95; application update p95 was 0.2 ms, render p95 0.2 ms, combined p95 0.4 ms. There was no measured frame-time bottleneck that justified additional simulation or draw-loop changes.

The old hero-animation fallback assets account for 88 startup requests / 469,481 bytes. They remain eager because deferring them adds fallback complexity for a small saving compared with the room PNGs.

## Verification

- `node --check` passed for `game.js`, `world.js`, `motion.js`, and the new loading regression. `node test/loading-performance.cjs` passed.
- Browser normal path: `library.webp` loaded, no legacy arena frame PNG was requested, wave 1 rendered, and no page errors occurred.
- Browser failure path: aborting `library.webp` caused `arena_frame_library.png` fallback request to return HTTP 200. If the Errata room script or room image is unavailable, the renderer uses the same fallback; room image errors trigger an immediate repaint.
- A controlled manifest override verified the new enemy animation helper requests exactly four textures for one encountered species, selects frames 0, 1, 2, and 3 at 0/125/250/375 ms, pins frame 0 under reduced motion, and resolves a boss alias to the canonical texture.

## Limitations

The before and after measurements include concurrent root changes to fonts and title artwork; normalized attribution is approximate. Measurements used local Chromium and the local static server, so cold-cache transfer and timing can differ on deployed devices and networks.
