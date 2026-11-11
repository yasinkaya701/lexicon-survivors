# Dense wave performance: deployed baseline and collision-loop change

## Exact build and repeatable scenario

- Baseline Pages build: `195203909675ce30b6c8f258448f84efef75ebe0`, status `built`.
- Baseline `game.js` SHA-256: `f6a4e9da5c7a74ffe783fabe9cf63d2f3a7f7d2254c09201667e54ec63023ea1`.
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
| After | 1 | 119.95 | 9.1 / 9.3 | 0.320 / 0.6 | 0.889 / 1.1 | 1.208 / 1.6 / 1.9 |
| After | 2 | 119.99 | 9.2 / 9.3 | 0.299 / 0.6 | 0.858 / 1.1 | 1.157 / 1.6 / 1.8 |
| After | 3 | 119.96 | 9.2 / 9.3 | 0.303 / 0.6 | 0.862 / 1.1 | 1.165 / 1.5 / 1.8 |

Every run kept 150 living enemies, all 128 player projectiles, and render scale 1.0. The live game filled enemy projectiles to its existing cap of 150. All six runs recorded zero frames over 16.7 ms, zero frames over 50 ms, and zero Long Tasks. At 120 Hz, RAF p95 was about 9.2 ms; measured game work p95 stayed at 1.5–1.6 ms, well within the 16.7 ms 60 Hz budget.

Across the three runs, mean update+render time moved from 1.197 ms to 1.177 ms (about 1.7%). Median game-work p95 and p99 did not change. Treat this as a small CPU-work reduction, not an FPS increase; the display stayed refresh-capped at about 120 FPS throughout.

## Chrome CPU and GC profile

One 35-second CPU profile and trace was collected before and after with the same fixture and warmup. In the pre-change profile, the two `forEach` callbacks inside `updateProjectiles`, `getNearbyEnemyIndices`, and `buildEnemyCollisionGrid` accumulated about 89 ms of sampled self time. After switching the candidate iteration to an indexed loop, the candidate callback no longer appeared as a separate sampled function; `updateProjectiles` plus grid building accumulated about 37 ms. This sampled CPU attribution is useful for locating work, but is not a frame-time guarantee.

The trace's top-level `MinorGC` and `MajorGC` events totaled 157 ms before and 188 ms after; the longest event was 3.2 ms before and 2.9 ms after. GC time did not show a clear reduction. `PerformanceObserver` does not expose `gc` entries in this Chrome build. These GC values come from one traced run per build and trace collection adds overhead, so they are diagnostic only.

The code change preserves candidate order and the existing hit, pierce, chain, split, and effect rules. It only removes the per-projectile candidate callback allocation; no spawn count, asset quality, visual setting, or combat rule changed.
