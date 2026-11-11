# Dense wave performance: deployed baseline and collision-loop change

## Exact build and repeatable scenario

- Baseline Pages build: `195203909675ce30b6c8f258448f84efef75ebe0`, status `built`.
- Baseline `game.js` SHA-256: `f6a4e9da5c7a74ffe783fabe9cf63d2f3a7f7d2254c09201667e54ec63023ea1`.
- Updated Pages build: `72b43f650c12caf56e514fd2e1ca1695d72499ca`, status `built`.
- Updated live `game.js` SHA-256: `14269c295e4d750b7b3750b235d90525cb98126d16ffb842f9be1c495799fd17`.
- Browser: same Playwright-managed Chrome session for every run; 1280×720 CSS viewport, DPR 1, 120 Hz refresh.
- Each run reloads the same build, waits 5 seconds, then measures for 35 seconds. Player movement repeats right, down, left, and up for one second each.
- A seeded setup uses the game's `spawnEnemy()` path at wave 60 / Hard difficulty. It holds 150 living enemies (14 commanders), 128 player projectiles and 128 enemy projectiles at the start; the game's normal enemy projectiles may fill their existing cap of 150 during the run. No enemy or projectile cap was lowered.
- Enemy health is raised only in the benchmark fixture so the population stays fixed. Render quality is left on its default adaptive path; measured scale remained 1.0. Game speed remains 1.0.
- The fixture and collection code are in `test/dense-wave-benchmark.playwright.js`. Its default target is the public Pages site; a local URL runs against that local origin. Adding `?profile=1` enables Chrome CPU sampling and a GC trace.

## Three 35-second runs

`RAF` is the measured browser frame interval. `Game work` is the instrumented `updateGame` plus `render` duration; `p95/p99` are nearest-rank percentiles in milliseconds.

| Build | Run | FPS | RAF p95 / p99 | Update avg / p95 | Render avg / p95 | Game work avg / p95 / p99 |
|---|---:|---:|---:|---:|---:|---:|
| Before | 1 | 119.96 | 9.3 / 9.4 | 0.346 / 0.6 | 0.874 / 1.1 | 1.220 / 1.6 / 1.9 |
| Before | 2 | 119.99 | 9.2 / 9.3 | 0.313 / 0.6 | 0.875 / 1.1 | 1.188 / 1.6 / 1.8 |
| Before | 3 | 119.97 | 9.2 / 9.3 | 0.312 / 0.6 | 0.870 / 1.1 | 1.182 / 1.6 / 1.8 |
| After (live) | 1 | 119.99 | 9.2 / 9.3 | 0.348 / 0.7 | 0.875 / 1.1 | 1.223 / 1.6 / 1.9 |
| After (live) | 2 | 119.96 | 9.2 / 9.3 | 0.348 / 0.6 | 0.879 / 1.1 | 1.228 / 1.6 / 1.9 |
| After (live) | 3 | 119.96 | 9.2 / 9.3 | 0.328 / 0.6 | 0.875 / 1.1 | 1.204 / 1.6 / 1.8 |

Every run kept 150 living enemies, all 128 player projectiles, and render scale 1.0. The live game filled enemy projectiles to its existing cap of 150. All six runs recorded zero frames over 16.7 ms, zero frames over 50 ms, and zero Long Tasks. At 120 Hz, RAF p95 was about 9.2 ms; measured game work p95 stayed at 1.5–1.6 ms, well within the 16.7 ms 60 Hz budget.

Across the three runs, mean update+render time was 1.197 ms before and 1.218 ms after deployment (about 1.8% higher). Median game-work p95 stayed 1.6 ms; median p99 moved from 1.8 ms to 1.9 ms. Treat these end-to-end results as effectively unchanged within run-to-run variation, with no measured FPS improvement; the display stayed refresh-capped at about 120 FPS throughout.

## Chrome CPU and GC profile

One 35-second CPU profile and trace was collected before and after with the same fixture and warmup. In the pre-change profile, the outer projectile callback, inner candidate callback, `getNearbyEnemyIndices`, and `buildEnemyCollisionGrid` accumulated about 89 ms of sampled self time. In the deployed profile the inner candidate callback no longer appeared as a separate sampled function; the outer callback, `updateProjectiles`, candidate lookup, and comparator totaled about 31 ms, while grid-building self time fell below the profiler's top 25 functions. This sampled CPU attribution points to less work in the targeted path, but is not a frame-time guarantee.

The trace's top-level `MinorGC` and `MajorGC` events totaled 157 ms before and 166 ms after; the longest event was 3.2 ms before and after. GC time did not show a clear reduction. `PerformanceObserver` does not expose `gc` entries in this Chrome build. These GC values come from one traced run per build and trace collection adds overhead, so they are diagnostic only.

The code change preserves candidate order and the existing hit, pierce, chain, split, and effect rules. It only removes the per-projectile candidate callback allocation; no spawn count, asset quality, visual setting, or combat rule changed.
