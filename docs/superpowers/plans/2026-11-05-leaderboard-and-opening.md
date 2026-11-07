# Leaderboard and Opening Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an anonymous global wave leaderboard backed by Cloudflare D1 and give web/Godot a brief, skippable archive-opening sequence.

**Architecture:** A small Cloudflare Worker exposes a read-only ranked list and a validated run-submission endpoint bound to D1. The clients keep a local personal record when offline and mark local/global results clearly. The title flow plays a short visual intro before character selection, with skip and reduced-motion paths.

**Tech Stack:** Cloudflare Workers, D1 migrations, Wrangler, JavaScript, Godot 4.x `AnimationPlayer`, HTML/CSS, Node built-in tests, local Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-library-exploration-mobile-leaderboard-design.md`

## Global Constraints

- Do not add an account/login system in this pass.
- Do not describe the client-submitted score table as cheat-proof. The client owns simulation today; v1 validation and rate limits can reject malformed/impossible values but cannot prove a run was honestly played.
- Permit browser requests only from the game's published Pages origin. Do not store raw IP addresses or commit API tokens.
- The existing Pages deployment is static. A persistent global board requires a server endpoint and a connected Cloudflare account.
- The current public HTML/JS build remains the deployable browser client; native Godot parity is developed and verified separately until an export template is available.
- Keep the opening sequence about 1.5–2 seconds, skippable with tap/Space, automatically skipped on later visits, and reduced to a quick fade under reduced-motion settings.

## Review Focus

- Invalid/missing `difficulty`, hero, alias, kills, wave, and elapsed time: reject without writing a row. Pin with API validation tests.
- Wrong origin, large body, excessive `limit`, and bursts of POSTs: reject/cap/rate-limit without returning D1 internals. Pin with Worker request tests.
- Duplicate submission retries: do not create duplicate rows or move a prior record unfairly. Pin idempotency with a repeated POST test.
- D1/API unavailable or slow: show local record and a retryable status; do not block game-over or restart. Pin frontend failure handling.
- Intro skipped before completion, reduced motion enabled, and returning player: reach character selection without an input trap. Pin Playwright and Godot scene tests.

---

### Task 1: Add the Worker and D1 Schema

**Files:**
- Create: `worker/package.json`
- Create: `worker/wrangler.jsonc`
- Create: `worker/src/index.js`
- Create: `worker/migrations/0001_leaderboard.sql`
- Test: `worker/test/leaderboard.test.js`

**Interfaces:**
- `GET /api/leaderboard?difficulty=<easy|normal|hard>&limit=<1..20>` returns `{ entries: [...] }`
- `POST /api/leaderboard` accepts `{ submissionId, alias, wavesCleared, kills, elapsedMs, characterId, difficultyId }` and returns `{ accepted, rank? }`
- D1 table stores normalized, bounded public fields and `created_at`; `submission_id` is unique

- [ ] **Step 1: Write validation and ranking tests**

Assert valid Turkish/Latin aliases normalize and truncate safely; invalid difficulty/hero, empty alias, negative counts, out-of-range waves/time, oversized body, and unknown fields reject; ordering is waves descending, kills descending, elapsed time ascending; duplicate IDs insert once.

- [ ] **Step 2: Run the Worker tests to confirm missing handlers fail**

Run: `cd worker && npm test`

Expected: tests fail until the exported validation/handler functions exist.

- [ ] **Step 3: Implement D1 migration and bounded API routes**

Use prepared statements for reads/writes. Enforce CORS for `https://yasinkaya701.github.io` only, handle `OPTIONS`, bound JSON body and list limit, sanitize alias, validate existing hero/difficulty IDs, use a rate-limit binding, and use a unique submission ID. Return generic public errors without D1 query text. Do not persist client IP addresses.

- [ ] **Step 4: Verify local Worker and D1 behavior**

Run: `cd worker && npm test`, then `npx wrangler dev --local` and exercise valid GET/POST, invalid payload, duplicate POST, and rejected origin with the test script.

Expected: valid row appears once in a difficulty-specific ranking; invalid or disallowed requests do not write.

### Task 2: Add Global and Local Scoreboard UI

**Files:**
- Modify: `build/web/index.html` title/run-result leaderboard entry and accessible modal
- Modify: `build/web/game.js` local profile, submission, fetch/rank rendering, and run-result flow
- Create: `scripts/leaderboard_client.gd` shared Godot HTTP client
- Modify: `scenes/title_screen.tscn` and `scripts/title_screen.gd` Godot leaderboard panel
- Modify: `scripts/main.gd` to submit the finalized native run result once
- Test: `test/leaderboard-ui` Playwright/browser harness and `test/gameplay_regression_test.gd`

**Interfaces:**
- `loadLeaderboard(difficultyId) -> Promise<Entry[]>`
- `submitRunResult(runSummary) -> Promise<{ accepted: boolean, rank?: number }>`
- Godot `LeaderboardClient.fetch_top(difficulty_id: String) -> void` emits `leaderboard_loaded(entries: Array, error: String)`
- Godot `LeaderboardClient.submit_run(summary: Dictionary) -> void` emits `submission_finished(accepted: bool, rank: int, error: String)`
- Local records use a separate storage key and label from global results

- [ ] **Step 1: Add UI flow assertions for local records and remote states**

Assert empty/loading/ready/offline states, a saved alias, top-20 layout, difficulty selection, and that game-over can close/restart while the API is unavailable.

- [ ] **Step 2: Implement the scoreboard panel and result submission**

Add an image-led `SIRALAMA` entry in both title screens, global rows showing rank/alias/wave/kills/time/hero, difficulty filter, local personal best, and a transparent “istemci skorudur” integrity note. Godot uses an `HTTPRequest` node against the same Worker API. Submit once after each final run result; retry using the same generated submission ID. API failure must leave the result screen usable.

- [ ] **Step 3: Verify online/offline and safe-content states**

Run the browser harness and Godot client parser checks with local Worker success, API rejection, and network failure. Expected: no blank overlay or uncaught error; alias text is rendered as text, not HTML; local result remains visible offline in both runtimes.

### Task 3: Add a Skippable Opening Sequence to Web and Godot

**Files:**
- Modify: `build/web/index.html` title overlay structure and animation CSS
- Modify: `build/web/game.js` first-visit/skip lifecycle
- Modify: `scenes/title_screen.tscn`
- Modify: `scripts/title_screen.gd`
- Test: browser animation checks and Godot scene tests

**Interfaces:**
- Web: `startArchiveIntro()`, `finishArchiveIntro(skipped: bool)`
- Godot: `start_intro()`, `skip_intro()`
- Both end at character selection; audio begins only after an explicit user gesture

- [ ] **Step 1: Add first-visit and skip-path assertions**

Verify intro can finish automatically, skip immediately by tap/Space, honor stored seen-state, and use a quick fade if reduced motion is enabled.

- [ ] **Step 2: Implement the short archive reveal in both title screens**

Use existing shelf/book/hero art with restrained light, parallax, and opacity/position animation. Avoid forced sound. Keep skip visibly discoverable and reachable on mobile.

- [ ] **Step 3: Verify browser and Godot title paths**

Run mobile and desktop Playwright checks plus `godot --headless --path . test/scene_instantiation_test.tscn`.

Expected: fresh visit shows the sequence; skip and reduced-motion reach the title immediately; later visits go straight to the title; no focus trap or input delay.

### Task 4: Connect and Deploy the Cloudflare Backend

**Files:**
- Modify: `worker/wrangler.jsonc` with the created D1 `database_id` (identifier only)
- Modify: `build/web/game.js` production API base URL
- Verify: Cloudflare Worker deployment and D1 migration state

- [ ] **Step 1: Check Cloudflare authentication and target resources**

Run: `npx wrangler whoami` and `npx wrangler d1 list`.

Expected: intended account is authenticated and the target D1 is known. Current local Wrangler auth was expired at design time; if login is required, ask the user to complete `wrangler login` in a visible terminal before proceeding.

- [ ] **Step 2: Create/bind D1 and apply migration**

Use the selected account, create `lexicon-survivors-leaderboard` only if absent, record its ID in config, and apply migrations remotely once.

- [ ] **Step 3: Deploy Worker and smoke-test public endpoints**

Run: `cd worker && npx wrangler deploy`; check allowed-origin GET/POST, rejected-origin POST, ranking order, and D1 row persistence.

- [ ] **Step 4: Publish web client only after the Worker is ready**

Update the configured API URL, run mobile/desktop browser checks, then deploy static files to the existing GitHub Pages `gh-pages` source.

Expected: global board works cross-device; local records remain available offline; Godot source behavior matches the web client.
